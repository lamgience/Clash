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
    "DIRECT"/**
 * ==============================================================================
 * Clash Verge / Mihomo 覆写脚本 (Script) - 旗舰版 [注释增强版]
 * ==============================================================================
 * * [核心特性]
 * 1. 智能分流：自动吸入订阅节点，基于正则进行地区分组 (香港/美国/日本等)。
 * 2. 深度优选：
 * - AI 服务 (OpenAI/Claude) 强制优选美国/新加坡节点，防止风控。
 * - 流媒体 (Netflix/Disney+) 自动匹配解锁节点。
 * - Speedtest 强制直连，节省代理流量。
 * 3. 内核调优：
 * - 启用 Sniffer 域名嗅探，解决纯 IP 请求的分流问题。
 * - 开启 TCP 并发与 Keep-Alive，显著降低连接延迟。
 * - DNS 采用 Split-Horizon 策略 (国内直连/国外代理)，防污染。
 * 4. 自动维护：
 * - 内置 GeoX 数据库国内 CDN 加速与自动更新。
 * - Hosts 修正 Google 连接检测超时问题。
 * * ==============================================================================
 */

function main(config) {
  // ========================================================================
  // [0] 预定义常量与策略逻辑
  // ========================================================================
  
  // 地区自动测速组名称 (对应 regionGroups 中的 name)
  // 系统会自动根据正则筛选对应地区的节点，并每隔一段时间自动选择延迟最低的。
  const regionProxies = [
    "香港节点", "台湾节点", "美国节点", "日本节点", "新加坡节点", 
    "英国节点", "韩国节点", "澳大利亚节点", "俄罗斯节点", "其他节点"
  ];
  
  // 基础备选列表
  // 用于 "节点选择" 组。包含自动、手动和各地区自动组，但不包含 "节点选择" 本身，
  // 物理上杜绝了循环引用 (Circular Reference) 的可能性。
  const baseProxies = [
    "自动选择", "手动切换", 
    ...regionProxies, 
    "DIRECT"
  ];

  // 通用应用列表
  // 适用于大多数无需特殊地区要求的应用 (如 Google, GitHub)。
  // 策略：首选 "自动选择" (性能优先)，同时也提供了手动干预的入口。
  const appProxies = [
    "自动选择", "节点选择", "手动切换", 
    ...regionProxies, 
    "DIRECT"
  ];

  // AI 专用列表
  // 策略：鉴于 AI 服务严格的风控，强制优先使用美国、日本、新加坡节点。
  // 顺序：美国 > 日本 > 新加坡 > 手动 > 自动 > 其他。
  const aiProxies = [
    "美国节点", "日本节点", "新加坡节点", 
    "手动切换", 
    "自动选择", "节点选择", 
    "香港节点", "台湾节点", 
    "英国节点", "韩国节点", "澳大利亚节点", "俄罗斯节点", "其他节点",
    "DIRECT"
  ];

  // 通用过滤器
  // 作用：从订阅中提取节点时，自动排除过期、流量耗尽、官网链接等无效节点。
  const commonFilter = {
    "include-all": true,
    "exclude-filter": "(?i)Traffic|Expire|Premium|频道|订阅|ISP|流量|到期|重置|请勿|剩余|套餐|跳转|官网|运营|更新",
  };

  // ========================================================================
  // [1] Mihomo (Meta) 内核深度配置
  // ========================================================================
  
  const yamlConfig = {
    // --- 基础运行模式 ---
    "mode": "rule",
    "mixed-port": 7897,
    "allow-lan": false,
    "log-level": "info",
    "ipv6": true,
    "external-controller": "127.0.0.1:9090", 
    "secret": "", 
    "external-controller-pipe": "\\\\.\\pipe\\verge-mihomo", 
    
    // --- 连接性能优化 ---
    "unified-delay": true,                 // 统一延迟测试 (去除 TCP 握手开销，显示更真实)
    "tcp-concurrent": true,                // [重要] 开启 TCP 并发连接，显著降低握手延迟
    "keep-alive-interval": 1800,           // TCP Keep Alive 间隔 (秒)，防止长连接断流
    "find-process-mode": "strict",         // 严格进程匹配模式，解决游戏/应用分流不准的问题
    "global-client-fingerprint": "chrome", // 模拟 Chrome 浏览器的 TLS 指纹，防止被服务端 (如 CF) 拦截

    // --- 持久化设置 ---
    "profile": {
      "store-selected": true               // [重要] 重启 Clash 后自动恢复上次手动选择的节点
    },

    // --- GeoX 数据库加速 (解决更新失败) ---
    "geodata-mode": true,                  // 启用新版 geodata 模式
    "geo-auto-update": true,               // 开启自动更新
    "geo-update-interval": 24,             // 更新间隔 (每 24 小时)
    "geox-url": {
      // 使用 MetaCubeX 的 CDN 镜像源，国内访问速度极快
      "geoip": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
      "geosite": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
      "mmdb": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"
    },

    // --- Sniffer 域名嗅探 (核心功能) ---
    // 作用：从 TLS/HTTP 流量中提取真实域名，解决 IP 直连 (如 Netflix TV 版) 导致的分流失效问题
    "sniffer": {
      "enable": true,
      "force-dns-mapping": true,    // 强制重置 DNS 映射，这对 Fake-IP 模式至关重要
      "parse-pure-ip": true,        // 对直接使用 IP 的请求进行嗅探
      "override-destination": true, // 将嗅探到的域名覆盖目标地址
      "sniff": {
        "TLS": { "ports": [443, 8443] },
        "HTTP": { "ports": [80, 8080, 8880] },
        "QUIC": { "ports": [443, 8443] }
      },
      // 排除列表：防止部分对嗅探敏感的应用 (如米家、苹果推送) 连接中断
      "skip-domain": [
        "Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com", "+.apple.com", "apple.com", "+.system.apple.com",
        "+.c.163.com", "*.music.126.net", "*.126.net", "*.122.com", "localhost", "*.local", "*.lan"
      ]
    },

    // --- 本地 Hosts 映射 ---
    "hosts": {
      // 示例：强制将路由器域名解析到内网 IP
      "router.asus.com": "192.168.50.1",
      
      // [优化] 解决 Clash 面板中 Google 连接测试经常超时/转圈的问题
      "mtalk.google.com": "108.177.125.188",
      "services.googleapis.com": "172.217.163.42",

      // [加速] GitHub 静态资源
      // 说明：GitHub IP 变动频繁，默认推荐走规则代理。仅在直连需求强烈时开启
      // "github.com": "20.205.243.166",
      // "raw.githubusercontent.com": "185.199.108.133",
      // "assets-cdn.github.com": "185.199.108.153",
      
      // [安全] 屏蔽特定恶意域名 (指向本地回环)
      "flash.cn": "127.0.0.1" 
    },

    // --- NTP 时间同步 ---
    // V2Ray/Trojan 等协议对时间敏感，使用阿里 NTP 服务确保时间精准
    "ntp-server": "ntp.aliyun.com",        

    // --- DNS 深度配置 (Split-DNS) ---
    "dns": {
      "enable": true,
      "listen": ":53",
      "ipv6": true,
      "enhanced-mode": "fake-ip", // Fake-IP 模式：返回虚拟 IP，极大提升网页加载速度
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": [
        "*.lan", "*.local", "*.arpa", "time.*.com", "ntp.*.com", 
        "+.market.xiaomi.com", "localhost.ptlogin2.qq.com", 
        "*.msftncsi.com", "www.msftconnecttest.com"
      ],
      "fake-ip-filter-mode": "blacklist",
      "default-nameserver": ["223.5.5.5", "119.29.29.29"], // 引导 DNS (用于解析 DoH 域名)
      "nameserver": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query", "8.8.8.8"], 
      "fallback": [],
      "fallback-filter": { "geoip": true, "geoip-code": "CN", "ipcidr": ["240.0.0.0/4"] },
      
      // [关键配置] 域名分流策略
      // 国内域名 -> 强制走阿里/腾讯 DoH (解析快，CDN 准确)
      // 国外域名 -> 强制走 Google/Cloudflare DoH (防污染)
      "nameserver-policy": {
        "geosite:cn,private": ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
        "geosite:geolocation-!cn": ["https://dns.google/dns-query", "https://1.1.1.1/dns-query"]
      }
    },
    "tun": {
      "enable": true,
      "stack": "mixed",
      "auto-route": true,            // 自动接管系统路由
      "auto-detect-interface": true, // 自动切换出口网卡 (解决切换 Wi-Fi 需重启代理的问题)
      "dns-hijack": ["any:53"],      // 劫持所有 DNS 请求
      "mtu": 1500
    }
  };

  config = Object.assign(config, yamlConfig);

  // ========================================================================
  // [2] 外部规则集 (Rule Providers)
  // ========================================================================
  
  // 辅助函数：快速生成 provider 对象
  const provider = (url, path, type = 'http', behavior = 'classical', format = 'text', interval = 86400) => ({
    url, path, type, behavior, format, interval
  });

  if (!config['rule-providers']) config['rule-providers'] = {};
  
  // 定义规则源 (ACL4SSR, MetaCubeX, Blackmatrix7)
  const aclUrl = "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/";
  const metaUrl = "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/";
  const blackUrl = "https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/";

  config["rule-providers"] = Object.assign(config["rule-providers"], {
    // --- 基础与系统 ---
    LocalAreaNetwork: provider(`${aclUrl}LocalAreaNetwork.list`, "./ruleset/LocalAreaNetwork.list"),
    UnBan: provider(`${aclUrl}UnBan.list`, "./ruleset/UnBan.list"),
    BanAD: provider(`${aclUrl}BanAD.list`, "./ruleset/BanAD.list"),
    BanProgramAD: provider(`${aclUrl}BanProgramAD.list`, "./ruleset/BanProgramAD.list"),
    Microsoft: provider(`${aclUrl}Microsoft.list`, "./ruleset/Microsoft.list"),
    MicrosoftEdge: provider(`${blackUrl}MicrosoftEdge/MicrosoftEdge.yaml`, "./ruleset/MicrosoftEdge.yaml", 'http', 'classical', 'yaml'),
    Apple: provider(`${aclUrl}Apple.list`, "./ruleset/Apple.list"),
    
    // --- 谷歌与微软 ---
    GoogleFCM: provider(`${aclUrl}Ruleset/GoogleFCM.list`, "./ruleset/GoogleFCM.list"),
    GoogleCN: provider(`${aclUrl}GoogleCN.list`, "./ruleset/GoogleCN.list"),
    google_domain: provider(`${metaUrl}geosite/google.yaml`, "./ruleset/google_domain.yaml", 'http', 'domain', 'yaml'),
    google_ip: provider(`${metaUrl}geoip/google.yaml`, "./ruleset/google_ip.yaml", 'http', 'ipcidr', 'yaml'),
    Bing: provider(`${aclUrl}Bing.list`, "./ruleset/Bing.list"),
    bing: provider(`${blackUrl}Bing/Bing.yaml`, "./ruleset/bing.yaml", 'http', 'classical', 'yaml'),
    OneDrive: provider(`${aclUrl}OneDrive.list`, "./ruleset/OneDrive.list"),

    // --- AI 人工智能 ---
    OpenAi: provider(`${blackUrl}OpenAI/OpenAI.yaml`, "./ruleset/openai.yaml", 'http', 'classical', 'yaml'),
    Openai: provider(`${metaUrl}geosite/openai.yaml`, "./ruleset/Openai.yaml", 'http', 'domain', 'yaml'),
    Gemini: provider(`${metaUrl}geosite/google-gemini.yaml`, "./ruleset/Gemini.yaml", 'http', 'domain', 'yaml'),
    gemini: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.yaml", "./ruleset/gemini.yaml", 'http', 'classical', 'yaml'),
    copilot: provider(`${blackUrl}Copilot/Copilot.yaml`, "./ruleset/copilot.yaml", 'http', 'classical', 'yaml'),
    claude: provider(`${blackUrl}Claude/Claude.yaml`, "./ruleset/claude.yaml", 'http', 'classical', 'yaml'),
    bard: provider(`${blackUrl}BardAI/BardAI.yaml`, "./ruleset/bard.yaml", 'http', 'classical', 'yaml'),
    perplexity: provider(`${metaUrl}geosite/perplexity.yaml`, "./ruleset/perplexity.yaml", 'http', 'domain', 'yaml'),

    // --- 生产力与开发 ---
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
    Origin: provider(`${aclUrl}Ruleset/Origin.list`, "./ruleset/Origin.list"),

    // --- 工具与直连 ---
    Speedtest: provider(`${blackUrl}Speedtest/Speedtest.yaml`, "./ruleset/speedtest.yaml", 'http', 'classical', 'yaml'),
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
  // [3] 策略组 (Proxy Groups)
  // ========================================================================
  
  // 自动测速组工厂函数
  const autoGroup = (name, regex, icon, testUrl = "http://www.gstatic.com/generate_204") => ({
    name, 
    type: "url-test", 
    url: testUrl, 
    interval: 300, 
    tolerance: 50, 
    filter: regex, 
    icon, 
    ...commonFilter
  });

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
    autoGroup(
      "奈飞节点", 
      "(?i)NF|奈飞|解锁|Netflix|NETFLIX|Media", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png",
      "https://www.netflix.com" // 使用 Netflix 官网测速，确保节点可用性
    ),
    autoGroup("其他节点", "(?i)阿根廷|AR|🇦🇷|奥地利|AT|🇦🇹|巴西|BR|🇧🇷|加拿大|CA|🇨🇦|瑞士|CH|🇨🇭|智利|CL|🇨🇱|德国|Germany|DE|🇩🇪|西班牙|ES|🇪🇸|芬兰|FI|🇫🇮|法国|France|FR|🇫🇷|印尼|ID|🇮🇩|爱尔兰|IE|🇮🇪|印度|IN|🇮🇳|意大利|IT|🇮🇹|卢森堡|LU|🇱🇺|马来西亚|MY|🇲🇾|荷兰|NL|🇳🇱|菲律宾|PH|🇵🇭|泰国|TH|🇹🇭|土耳其|TR|🇹🇷|越南|VN|🇻🇳|南非|ZA|🇿🇦", "https://img.icons8.com/?size=100&id=QiwSMfboPt2R&format=png&color=000000"),
  ];

  config["proxy-groups"] = [
    { name: "节点选择", type: "select", proxies: baseProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png", ...commonFilter },
    { name: "手动切换", type: "select", proxies: [...regionProxies], icon: "https://testingcf.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png", ...commonFilter },
    { name: "自动选择", type: "url-test", url: "http://www.gstatic.com/generate_204", interval: 300, tolerance: 50, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png", ...commonFilter },
    
    // --- AI 分组 ---
    { name: "AIGC", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=mSC3ebe4W6w6&format=png&color=000000" },
    { name: "Gemini", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=ETVUfl0Ylh1p&format=png&color=000000" },
    { name: "OpenAi", type: "select", proxies: aiProxies, icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png" },
    { name: "Copilot", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=A5L2E9lJjaSB&format=png&color=000000" },
    { name: "Claude", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=kDfpmWz6OSCQ&format=png&color=000000" },
    
    // --- 生产力与应用 ---
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
    
    // --- 国内与直连 ---
    { name: "国内媒体", type: "select", proxies: ["节点选择", "自动选择", "手动切换", ...regionProxies, "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/DomesticMedia.png" },
    { name: "苹果服务", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=fpDIWrTmgyvx&format=png&color=000000" },
    { name: "微信", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=qXin8dFXNXBX&format=png&color=000000" },
    { name: "哔哩哔哩", type: "select", proxies: ["DIRECT", "节点选择", "自动选择", "香港节点", "台湾节点"], icon: "https://img.icons8.com/?size=100&id=l87yXVtzuGWB&format=png&color=000000" },
    { name: "网易音乐", type: "select", proxies: ["DIRECT", "节点选择", "自动选择"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netease_Music.png", filter: "(?i)网易|音乐|NetEase|Music", ...commonFilter },
    
    // --- 特殊与兜底 ---
    { name: "哔哩哔哩港澳台", type: "select", proxies: ["节点选择", "自动选择", "手动切换", "香港节点", "台湾节点", "全球直连", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png" },
    { name: "巴哈姆特", type: "select", proxies: ["节点选择", "手动切换", "台湾节点", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png" },
    { name: "机场专线", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=guJpUesVT0mI&format=png&color=000000" },
    { name: "全球直连", type: "select", proxies: ["DIRECT", "节点选择", "自动选择"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png" },
    { name: "广告拦截", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png" },
    { name: "应用净化", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hijacking.png" },
    { name: "漏网之鱼", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png" },
    
    ...regionGroups
  ];

  // ========================================================================
  // [4] 分流规则 (Rules)
  // ========================================================================
  config["rules"] = [
    // --- 优先级 1: 局域网、隐私与广告拦截 ---
    "RULE-SET,LocalAreaNetwork,全球直连",
    "RULE-SET,private,DIRECT",
    "RULE-SET,UnBan,全球直连",
    "RULE-SET,BanAD,广告拦截",
    "RULE-SET,BanProgramAD,应用净化",
    
    // --- 优先级 2: AI 服务 (高优先级，防止误走其他代理) ---
    "RULE-SET,OpenAi,OpenAi",
    "RULE-SET,Openai,OpenAi",
    "RULE-SET,Gemini,Gemini",
    "RULE-SET,gemini,Gemini",
    "RULE-SET,claude,Claude",
    "RULE-SET,copilot,Copilot",
    "RULE-SET,bard,AIGC",
    "RULE-SET,perplexity,AIGC",
    
    // --- 优先级 3: 核心服务 (Google/Microsoft) ---
    "RULE-SET,GoogleFCM,谷歌",
    "RULE-SET,google_domain,谷歌",
    "RULE-SET,google_ip,谷歌",
    "RULE-SET,YouTube,YouTube",
    "RULE-SET,GoogleCN,谷歌",
    "RULE-SET,MicrosoftEdge,微软",
    "RULE-SET,OneDrive,微软",
    "RULE-SET,Microsoft,微软",
    "RULE-SET,bing,微软",
    "RULE-SET,Bing,微软",
    
    // --- 优先级 4: 生产力与开发 ---
    "RULE-SET,Notion,Notion",
    "RULE-SET,GitHub,GitHub",
    "RULE-SET,Adobe,Adobe",
    
    // --- 优先级 5: 社交网络 ---
    "RULE-SET,Discord,国外社交",
    "RULE-SET,telegram_domain,Telegram",
    "RULE-SET,telegram_ip,Telegram",
    "RULE-SET,x,国外社交",
    "RULE-SET,reddit,国外社交",
    "RULE-SET,Instagram,国外社交",
    "RULE-SET,Threads,国外社交",
    
    // --- 优先级 6: 流媒体 ---
    "RULE-SET,Netflix,Netflix",
    "RULE-SET,Spotify,Spotify",
    "RULE-SET,TikTok,国外媒体",
    "RULE-SET,Disney,国外媒体",
    "RULE-SET,PrimeVideo,国外媒体",
    "RULE-SET,HBO,国外媒体",
    "RULE-SET,GlobalMedia,国外媒体",
    "RULE-SET,ProxyMedia,国外媒体",
    
    // --- 优先级 7: 游戏 ---
    "RULE-SET,Epic,游戏平台",
    "RULE-SET,Origin,游戏平台",
    "RULE-SET,Sony,游戏平台",
    "RULE-SET,Steam,游戏平台",
    "RULE-SET,Nintendo,游戏平台",
    "RULE-SET,Bahamut,巴哈姆特",
    "RULE-SET,Bilibili,哔哩哔哩",
    "RULE-SET,BilibiliHMT,哔哩哔哩港澳台",
    "RULE-SET,NetEaseMusic,网易音乐",
    
    // --- 优先级 8: 直连服务与工具 ---
    "RULE-SET,Speedtest,全球直连", // Speedtest 测速直连
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
    
    // --- 优先级 9: 兜底 ---
    "MATCH,漏网之鱼"
  ];

  return config;
}
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