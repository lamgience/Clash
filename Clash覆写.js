/**
 * ==============================================================================
 * Clash Verge / Mihomo 覆写脚本 (Script) - 旗舰版
 * ==============================================================================
 * 核心功能：
 * 1. 动态生成策略组：自动吸入订阅节点，无需手动指定节点名称
 * 2. 智能 DNS 分流：国内走阿里/腾讯 DoH，国外走 Google DoH，防污染且速度快
 * 3. AI 深度优化：OpenAI/Claude 等服务强制优选美国节点
 * 4. 自动地区分组：基于正则 (Regex) 自动归类节点到对应国家/地区
 * ==============================================================================
 */

function main(config) {
  // ========================================================================
  // 0. 预定义常量与工具函数 (Constants & Helpers)
  // ========================================================================
  
  // 地区节点列表：用于后续生成自动测速组和手动选择组
  const regionProxies = [
    "香港节点", "台湾节点", "美国节点", "日本节点", "新加坡节点", 
    "英国节点", "韩国节点", "澳大利亚节点", "俄罗斯节点", "其他节点"
  ];
  
  // 基础代理列表：包含自动、手动和地区
  const baseProxies = [
    "自动选择", "手动切换", 
    ...regionProxies, 
    "DIRECT"
  ];

  // 应用代理列表：用于绝大多数普通应用 (Telegram, YouTube 等)
  const appProxies = [
    "自动选择", "节点选择", "手动切换", 
    ...regionProxies, 
    "DIRECT"
  ];

  // AI 专用代理列表
  // 优先级逻辑：美国(最佳) > 日本(低延迟备选) > 新加坡 > 手动
  const aiProxies = [
    "美国节点", "日本节点", "新加坡节点", 
    "手动切换", 
    "自动选择", "节点选择", 
    "香港节点", "台湾节点", 
    "英国节点", "韩国节点", "澳大利亚节点", "俄罗斯节点", "其他节点",
    "DIRECT"
  ];

  // 通用过滤器配置
  // 核心功能：include-all: true 允许策略组“吸入”所有订阅中的节点
  // exclude-filter：正则过滤掉到期、流量提示等无效节点
  const commonFilter = {
    "include-all": true,
    "exclude-filter": "(?i)Traffic|Expire|Premium|频道|订阅|ISP|流量|到期|重置|请勿|剩余|套餐|跳转|官网|运营|更新",
  };

  // ========================================================================
  // 1. 基础配置合并 (Mihomo/Meta Kernel Tuning)
  // ========================================================================
  
  const yamlConfig = {
    "mode": "rule",
    "mixed-port": 7897,
    "allow-lan": false,
    "log-level": "info",
    "ipv6": true,
    "external-controller": "127.0.0.1:9090", 
    "secret": "", 
    "external-controller-pipe": "\\\\.\\pipe\\verge-mihomo", 
    "unified-delay": true,                 // 统一延迟计算，去除握手开销
    "find-process-mode": "strict",         // 严格进程匹配模式，解决游戏/应用分流不准问题
    "global-client-fingerprint": "chrome", // 模拟 Chrome TLS 指纹，防止被服务端识别为 Bot

    // --- DNS 深度优化 (Split-DNS) ---
    "dns": {
      "enable": true,
      "listen": ":53",
      "ipv6": true,
      "enhanced-mode": "fake-ip",         // Fake-IP 模式：返回虚拟 IP 秒开网页
      "fake-ip-range": "198.18.0.1/16",
      // Fake-IP 过滤：以下域名强制走真实 IP 解析，解决连通性测试和局域网问题
      "fake-ip-filter": [
        "*.lan", "*.local", "*.arpa", "time.*.com", "ntp.*.com", 
        "+.market.xiaomi.com", "localhost.ptlogin2.qq.com", 
        "*.msftncsi.com", "www.msftconnecttest.com"
      ],
      "fake-ip-filter-mode": "blacklist",
      "default-nameserver": ["223.5.5.5", "119.29.29.29"], // 引导 DNS
      "nameserver": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query", "8.8.8.8"], 
      "fallback": [],
      "fallback-filter": { "geoip": true, "geoip-code": "CN", "ipcidr": ["240.0.0.0/4"] },
      // 核心策略：DNS 分流
      // 国内域名 -> 阿里/腾讯 DoH；国外域名 -> Google/Cloudflare DoH
      "nameserver-policy": {
        "geosite:cn,private": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
        "geosite:geolocation-!cn": ["https://dns.google/dns-query", "https://1.1.1.1/dns-query"]
      }
    },
    "tun": {
      "enable": true,
      "stack": "mixed",
      "auto-route": true,            // 自动配置路由表，接管系统流量
      "auto-detect-interface": true, // 自动识别出口网卡
      "dns-hijack": ["any:53"],      // 劫持 DNS 查询
      "mtu": 1500
    }
  };

  // 合并用户配置与 YAML 配置
  config = Object.assign(config, yamlConfig);

  // ========================================================================
  // 2. 规则集定义 (Rule Providers)
  // ========================================================================
  
  // 辅助函数：简化 rule-provider 的创建
  const provider = (url, path, type = 'http', behavior = 'classical', format = 'text', interval = 86400) => ({
    url, path, type, behavior, format, interval
  });

  if (!config['rule-providers']) config['rule-providers'] = {};
  
  // 规则源地址常量
  const aclUrl = "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/";
  const metaUrl = "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/";
  const blackUrl = "https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/";

  config["rule-providers"] = Object.assign(config["rule-providers"], {
    // --- 基础/去广告/系统 ---
    LocalAreaNetwork: provider(`${aclUrl}LocalAreaNetwork.list`, "./ruleset/LocalAreaNetwork.list"),
    UnBan: provider(`${aclUrl}UnBan.list`, "./ruleset/UnBan.list"),
    BanAD: provider(`${aclUrl}BanAD.list`, "./ruleset/BanAD.list"),
    BanProgramAD: provider(`${aclUrl}BanProgramAD.list`, "./ruleset/BanProgramAD.list"),
    Microsoft: provider(`${aclUrl}Microsoft.list`, "./ruleset/Microsoft.list"),
    MicrosoftEdge: provider(`${blackUrl}MicrosoftEdge/MicrosoftEdge.yaml`, "./ruleset/MicrosoftEdge.yaml", 'http', 'classical', 'yaml'),
    Apple: provider(`${aclUrl}Apple.list`, "./ruleset/Apple.list"),
    
    // --- 谷歌/搜索/微软 ---
    GoogleFCM: provider(`${aclUrl}Ruleset/GoogleFCM.list`, "./ruleset/GoogleFCM.list"),
    GoogleCN: provider(`${aclUrl}GoogleCN.list`, "./ruleset/GoogleCN.list"),
    google_domain: provider(`${metaUrl}geosite/google.yaml`, "./ruleset/google_domain.yaml", 'http', 'domain', 'yaml'),
    google_ip: provider(`${metaUrl}geoip/google.yaml`, "./ruleset/google_ip.yaml", 'http', 'ipcidr', 'yaml'),
    Bing: provider(`${aclUrl}Bing.list`, "./ruleset/Bing.list"),
    bing: provider(`${blackUrl}Bing/Bing.yaml`, "./ruleset/bing.yaml", 'http', 'classical', 'yaml'),
    OneDrive: provider(`${aclUrl}OneDrive.list`, "./ruleset/OneDrive.list"),

    // --- AI 服务 (OpenAI, Gemini, Claude 等) ---
    OpenAi: provider(`${blackUrl}OpenAI/OpenAI.yaml`, "./ruleset/openai.yaml", 'http', 'classical', 'yaml'),
    Openai: provider(`${metaUrl}geosite/openai.yaml`, "./ruleset/Openai.yaml", 'http', 'domain', 'yaml'),
    Gemini: provider(`${metaUrl}geosite/google-gemini.yaml`, "./ruleset/Gemini.yaml", 'http', 'domain', 'yaml'),
    gemini: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.yaml", "./ruleset/gemini.yaml", 'http', 'classical', 'yaml'),
    copilot: provider(`${blackUrl}Copilot/Copilot.yaml`, "./ruleset/copilot.yaml", 'http', 'classical', 'yaml'),
    claude: provider(`${blackUrl}Claude/Claude.yaml`, "./ruleset/claude.yaml", 'http', 'classical', 'yaml'),
    bard: provider(`${blackUrl}BardAI/BardAI.yaml`, "./ruleset/bard.yaml", 'http', 'classical', 'yaml'),
    perplexity: provider(`${metaUrl}geosite/perplexity.yaml`, "./ruleset/perplexity.yaml", 'http', 'domain', 'yaml'),

    // --- 生产力 (Notion/GitHub) ---
    Notion: provider(`${blackUrl}Notion/Notion.yaml`, "./ruleset/notion.yaml", 'http', 'classical', 'yaml'),
    GitHub: provider(`${blackUrl}GitHub/GitHub.yaml`, "./ruleset/GitHub.yaml", 'http', 'classical', 'yaml'),
    Adobe: provider(`${metaUrl}geosite/adobe.yaml`, "./ruleset/adobe.yaml", 'http', 'domain', 'yaml'),

    // --- 社交/流媒体/应用 ---
    telegram_ip: provider(`${metaUrl}geoip/telegram.yaml`, "./ruleset/telegram_ip.yaml", 'http', 'ipcidr', 'yaml'),
    telegram_domain: provider(`${metaUrl}geosite/telegram.yaml`, "./ruleset/telegram_domain.yaml", 'http', 'domain', 'yaml'),
    x: provider(`${blackUrl}Twitter/Twitter.yaml`, "./ruleset/x.yaml", 'http', 'classical', 'yaml'),
    Instagram: provider(`${blackUrl}Instagram/Instagram.yaml`, "./ruleset/Instagram.yaml", 'http', 'classical', 'yaml'),
    Threads: provider(`${blackUrl}Threads/Threads.yaml`, "./ruleset/Threads.yaml", 'http', 'classical', 'yaml'),
    reddit: provider(`${metaUrl}geosite/reddit.yaml`, "./ruleset/reddit.yaml", 'http', 'domain', 'yaml'),
    Discord: provider(`${blackUrl}Discord/Discord.yaml`, "./ruleset/discord.yaml", 'http', 'classical', 'yaml'),
    
    Spotify: provider(`${blackUrl}Spotify/Spotify.yaml`, "./ruleset/Spotify.yaml", 'http', 'classical', 'yaml'),
    YouTube: provider(`${aclUrl}Ruleset/YouTube.list`, "./ruleset/YouTube.list"),
    Netflix: provider(`${aclUrl}Ruleset/Netflix.list`, "./ruleset/Netflix.list"),
    TikTok: provider(`${blackUrl}TikTok/TikTok.yaml`, "./ruleset/tiktok.yaml", 'http', 'classical', 'yaml'),
    Disney: provider(`${blackUrl}Disney/Disney.yaml`, "./ruleset/disney.yaml", 'http', 'classical', 'yaml'),
    PrimeVideo: provider(`${blackUrl}PrimeVideo/PrimeVideo.yaml`, "./ruleset/primevideo.yaml", 'http', 'classical', 'yaml'),
    HBO: provider(`${blackUrl}HBO/HBO.yaml`, "./ruleset/hbo.yaml", 'http', 'classical', 'yaml'),
    WeChat: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Surge/WeChat/WeChat.list", "./ruleset/WeChat.list"),
    
    // --- 游戏 ---
    Steam: provider(`${blackUrl}Steam/Steam.yaml`, "./ruleset/steam.yaml", 'http', 'classical', 'yaml'),
    SteamCN: provider(`${aclUrl}Ruleset/SteamCN.list`, "./ruleset/SteamCN.list"),
    Epic: provider(`${aclUrl}Ruleset/Epic.list`, "./ruleset/Epic.list"),
    Sony: provider(`${aclUrl}Ruleset/Sony.list`, "./ruleset/Sony.list"),
    Nintendo: provider(`${aclUrl}Ruleset/Nintendo.list`, "./ruleset/Nintendo.list"),
    Bahamut: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Bahamut/Bahamut.yaml", "./ruleset/Bahamut.yaml", 'http', 'classical', 'yaml'),
    BilibiliHMT: provider(`${aclUrl}Ruleset/BilibiliHMT.list`, "./ruleset/BilibiliHMT.list"),
    Bilibili: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml", "./ruleset/Bilibili.yaml", 'http', 'classical', 'yaml'),
    NetEaseMusic: provider(`${aclUrl}Ruleset/NetEaseMusic.list`, "./ruleset/NetEaseMusic.list"),
    Origin: provider(`${aclUrl}Ruleset/Origin.list`, "./ruleset/Origin.list"), // 确认存在

    // --- 区域与直连 (GeoIP/GeoSite) ---
    private: provider(`${metaUrl}geosite/private.yaml`, "./ruleset/private.yaml", 'http', 'domain', 'yaml'),
    cn_domain: provider(`${metaUrl}geosite/cn.yaml`, "./ruleset/cn_domain.yaml", 'http', 'domain', 'yaml'),
    ChinaDomain: provider(`${aclUrl}ChinaDomain.list`, "./ruleset/ChinaDomain.list", 'http', 'domain'),
    ChinaCompanyIp: provider(`${aclUrl}ChinaCompanyIp.list`, "./ruleset/ChinaCompanyIp.list", 'http', 'ipcidr'),
    "geolocation-!cn": provider(`${metaUrl}geosite/geolocation-!cn.yaml`, "./ruleset/geolocation-!cn.yaml", 'http', 'domain', 'yaml'),
    cn_ip: provider(`${metaUrl}geoip/cn.yaml`, "./ruleset/cn_ip.yaml", 'http', 'ipcidr', 'yaml'),
    freedom: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/freedom.yaml", "./ruleset/freedom.yaml", 'http', 'domain', 'yaml'),
    direct_cus: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/Direct_wi.yaml", "./ruleset/Direct_wi.yaml", 'http', 'domain', 'yaml'),
    Airport: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/Airport.yaml", "./ruleset/Airport.yaml", 'http', 'domain', 'yaml'),
    ChinaMedia: provider(`${aclUrl}ChinaMedia.list`, "./ruleset/ChinaMedia.list"),
    ProxyMedia: provider(`${aclUrl}ProxyMedia.list`, "./ruleset/ProxyMedia.list"),
    GlobalMedia: provider(`${blackUrl}GlobalMedia/GlobalMedia.yaml`, "./ruleset/globalmedia.yaml", 'http', 'classical', 'yaml'),
    ProxyGFWlist: provider(`${aclUrl}ProxyGFWlist.list`, "./ruleset/ProxyGFWlist.list"),
    Download: provider(`${aclUrl}Download.list`, "./ruleset/Download.list"),
  });

  // ========================================================================
  // 3. 策略组构建 (Proxy Groups)
  // ========================================================================
  
  // 辅助函数：生成自动测速组 (URL-Test)
  const autoGroup = (name, regex, icon, testUrl = "http://www.gstatic.com/generate_204") => ({
    name, 
    type: "url-test", 
    url: testUrl, 
    interval: 300, 
    tolerance: 50, 
    filter: regex, 
    icon, 
    ...commonFilter // 继承 commonFilter 以吸入所有订阅节点
  });

  // 定义地区自动组 (通过正则筛选节点)
  const regionGroups = [
    autoGroup("香港节点", "(?i)香港|Hong Kong|HK|🇭🇰|HongKong|HGC|WTT|HKBN|PCCW", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png"),
    autoGroup("台湾节点", "(?i)台湾|臺灣|Taiwan|TW|🇹🇼|TaiWan|Hinet|TFN", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png"),
    autoGroup("美国节点", "(?i)美国|USA|United States|US|🇺🇸|America|Los Angeles|San Jose|Silicon Valley|Seattle|Chicago|New York|Miami|Atlanta|Dallas|Fremont|Phoenix|Santa Clara", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png"),
    autoGroup("日本节点", "(?i)日本|Japan|JP|🇯🇵|Tokyo|Osaka|Saitama|Kawaguchi", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png"),
    autoGroup("新加坡节点", "(?i)新加坡|Singapore|SG|🇸🇬|狮城|Lion City", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png"),
    autoGroup("英国节点", "(?i)英国|UK|United Kingdom|GB|🇬🇧|London|England", "https://img.icons8.com/?size=100&id=15534&format=png&color=000000"),
    autoGroup("韩国节点", "(?i)韩国|Korea|KR|🇰🇷|Seoul|KOR", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png"),
    autoGroup("澳大利亚节点", "(?i)澳大利亚|Australia|AU|🇦🇺|Sydney|Melbourne", "https://img.icons8.com/?size=100&id=22557&format=png&color=000000"),
    autoGroup("俄罗斯节点", "(?i)俄罗斯|Russia|RU|🇷🇺|Moscow|Saint Petersburg", "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/ru.svg"),
    // 奈飞专用组 (使用 netflix.com 测速以确保解锁状态)
    autoGroup(
      "奈飞节点", 
      "(?i)NF|奈飞|解锁|Netflix|NETFLIX|Media", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png",
      "https://www.netflix.com"
    ),
    // 兜底组 (匹配小众国家)
    autoGroup("其他节点", "(?i)阿根廷|AR|🇦🇷|奥地利|AT|🇦🇹|巴西|BR|🇧🇷|加拿大|CA|🇨🇦|瑞士|CH|🇨🇭|智利|CL|🇨🇱|德国|Germany|DE|🇩🇪|西班牙|ES|🇪🇸|芬兰|FI|🇫🇮|法国|France|FR|🇫🇷|印尼|ID|🇮🇩|爱尔兰|IE|🇮🇪|印度|IN|🇮🇳|意大利|IT|🇮🇹|卢森堡|LU|🇱🇺|马来西亚|MY|🇲🇾|荷兰|NL|🇳🇱|菲律宾|PH|🇵🇭|泰国|TH|🇹🇭|土耳其|TR|🇹🇷|越南|VN|🇻🇳|南非|ZA|🇿🇦", "https://img.icons8.com/?size=100&id=QiwSMfboPt2R&format=png&color=000000"),
  ];

  config["proxy-groups"] = [
    // --- 核心控制组 ---
    { name: "节点选择", type: "select", proxies: baseProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png", ...commonFilter },
    { name: "手动切换", type: "select", proxies: [...regionProxies], icon: "https://testingcf.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png", ...commonFilter },
    { name: "自动选择", type: "url-test", url: "http://www.gstatic.com/generate_204", interval: 300, tolerance: 50, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png", ...commonFilter },
    
    // --- AI 服务分组 (高优先级) ---
    { name: "AIGC", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=mSC3ebe4W6w6&format=png&color=000000" },
    { name: "Gemini", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=ETVUfl0Ylh1p&format=png&color=000000" },
    { name: "OpenAi", type: "select", proxies: aiProxies, icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png" },
    { name: "Copilot", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=A5L2E9lJjaSB&format=png&color=000000" },
    { name: "Claude", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=kDfpmWz6OSCQ&format=png&color=000000" },
    
    // --- 生产力与开发者 ---
    { name: "Notion", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Notion.png" },
    { name: "GitHub", type: "select", proxies: appProxies, icon: "https://img.icons8.com/?size=100&id=LoL4bFzqmAa0&format=png&color=000000" },
    { name: "Adobe", type: "select", proxies: appProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/adobe.svg" },
    { name: "微软", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png" },
    { name: "谷歌", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google_Search.png" },
    
    // --- 社交与媒体 ---
    { name: "Telegram", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png" },
    { name: "国外社交", type: "select", proxies: appProxies, icon: "https://img.icons8.com/?size=100&id=ZNMifeqJbPRv&format=png&color=000000" },
    { name: "国外媒体", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ForeignMedia.png" },
    { name: "YouTube", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png" },
    { name: "Netflix", type: "select", proxies: ["奈飞节点", ...appProxies], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png" },
    { name: "Spotify", type: "select", proxies: appProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/spotify.svg" },
    
    // --- 游戏 ---
    { name: "游戏平台", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Game.png" },
    { name: "自由意志", type: "select", proxies: appProxies, icon: "https://img.icons8.com/?size=100&id=kYqbEzjS6EBh&format=png&color=000000" },
    
    // --- 国内与直连策略 ---
    { name: "国内媒体", type: "select", proxies: ["节点选择", "自动选择", "手动切换", ...regionProxies, "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/DomesticMedia.png" },
    { name: "苹果服务", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=fpDIWrTmgyvx&format=png&color=000000" },
    { name: "微信", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=qXin8dFXNXBX&format=png&color=000000" },
    { name: "哔哩哔哩", type: "select", proxies: ["DIRECT", "节点选择", "自动选择", "香港节点", "台湾节点"], icon: "https://img.icons8.com/?size=100&id=l87yXVtzuGWB&format=png&color=000000" },
    { name: "网易音乐", type: "select", proxies: ["DIRECT", "节点选择", "自动选择"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netease_Music.png", filter: "(?i)网易|音乐|NetEase|Music", ...commonFilter },
    
    // --- 兜底与功能组 ---
    { name: "哔哩哔哩港澳台", type: "select", proxies: ["节点选择", "自动选择", "手动切换", "香港节点", "台湾节点", "全球直连", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png" },
    { name: "巴哈姆特", type: "select", proxies: ["节点选择", "手动切换", "台湾节点", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png" },
    { name: "机场专线", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=guJpUesVT0mI&format=png&color=000000" },
    { name: "全球直连", type: "select", proxies: ["DIRECT", "节点选择", "自动选择"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png" },
    { name: "广告拦截", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png" },
    { name: "应用净化", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hijacking.png" },
    { name: "漏网之鱼", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png" },
    
    // --- 注入地区自动组 ---
    ...regionGroups
  ];

  // ========================================================================
  // 4. 分流规则 (Rules)
  // ========================================================================
  // 匹配顺序：自上而下，一旦命中即停止匹配
  config["rules"] = [
    // 1. 基础/局域网/去广告 (最高优先级)
    "RULE-SET,LocalAreaNetwork,全球直连",
    "RULE-SET,private,DIRECT",
    "RULE-SET,UnBan,全球直连",
    "RULE-SET,BanAD,广告拦截",
    "RULE-SET,BanProgramAD,应用净化",
    
    // 2. AI 服务 (优先级高于谷歌/微软，防止规则冲突)
    "RULE-SET,OpenAi,OpenAi",
    "RULE-SET,Openai,OpenAi",
    "RULE-SET,Gemini,Gemini",
    "RULE-SET,gemini,Gemini",
    "RULE-SET,claude,Claude",
    "RULE-SET,copilot,Copilot",
    "RULE-SET,bard,AIGC",
    "RULE-SET,perplexity,AIGC",
    
    // 3. 谷歌生态
    "RULE-SET,YouTube,YouTube",
    "RULE-SET,GoogleFCM,谷歌",
    "RULE-SET,google_domain,谷歌",
    "RULE-SET,google_ip,谷歌",
    "RULE-SET,GoogleCN,谷歌",
    
    // 4. 生产力 & 开发者
    "RULE-SET,Notion,Notion",
    "RULE-SET,GitHub,GitHub",
    "RULE-SET,Adobe,Adobe",
    "RULE-SET,MicrosoftEdge,微软",
    "RULE-SET,OneDrive,微软",
    "RULE-SET,Microsoft,微软",
    "RULE-SET,bing,微软",
    "RULE-SET,Bing,微软",
    
    // 5. 社交网络
    "RULE-SET,Discord,国外社交",
    "RULE-SET,telegram_domain,Telegram",
    "RULE-SET,telegram_ip,Telegram",
    "RULE-SET,x,国外社交",
    "RULE-SET,reddit,国外社交",
    "RULE-SET,Instagram,国外社交",
    "RULE-SET,Threads,国外社交",
    
    // 6. 流媒体服务
    "RULE-SET,Netflix,Netflix",
    "RULE-SET,Spotify,Spotify",
    "RULE-SET,TikTok,国外媒体",
    "RULE-SET,Disney,国外媒体",
    "RULE-SET,PrimeVideo,国外媒体",
    "RULE-SET,HBO,国外媒体",
    "RULE-SET,GlobalMedia,国外媒体",
    "RULE-SET,ProxyMedia,国外媒体",
    
    // 7. 游戏平台
    "RULE-SET,Epic,游戏平台",
    "RULE-SET,Origin,游戏平台",
    "RULE-SET,Sony,游戏平台",
    "RULE-SET,Steam,游戏平台",
    "RULE-SET,Nintendo,游戏平台",
    "RULE-SET,Bahamut,巴哈姆特",
    "RULE-SET,Bilibili,哔哩哔哩",
    "RULE-SET,BilibiliHMT,哔哩哔哩港澳台",
    "RULE-SET,NetEaseMusic,网易音乐",
    
    // 8. 国内服务与 GEOIP 兜底
    "RULE-SET,WeChat,微信",
    "RULE-SET,Apple,苹果服务",
    "RULE-SET,freedom,自由意志",
    "RULE-SET,direct_cus,DIRECT",
    "RULE-SET,Airport,机场专线",
    "RULE-SET,SteamCN,全球直连",
    "RULE-SET,ChinaMedia,国内媒体",
    "RULE-SET,ProxyGFWlist,节点选择",
    "RULE-SET,ChinaDomain,全球直连",
    "RULE-SET,ChinaCompanyIp,全球直连",
    "RULE-SET,geolocation-!cn,节点选择",
    "RULE-SET,cn_domain,DIRECT",
    "RULE-SET,cn_ip,DIRECT",
    "RULE-SET,Download,全球直连",
    "GEOIP,CN,全球直连",
    
    // 9. 最终兜底 (未匹配流量)
    "MATCH,漏网之鱼"
  ];

  return config;
}