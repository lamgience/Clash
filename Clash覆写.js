
function main(config) {
  // ========================================================================
  // 0. 预定义常量区
  // ========================================================================
  
  /**
   * 地区节点列表
   * 这些是策略组（自动测速组），不是真实节点
   * 每个组会自动从所有节点中筛选对应地区的节点并测速选择最快的
   */
  const regionProxies = [
    "香港节点",      // 香港地区自动测速组
    "台湾节点",      // 台湾地区自动测速组
    "美国节点",      // 美国地区自动测速组
    "日本节点",      // 日本地区自动测速组
    "新加坡节点",    // 新加坡地区自动测速组
    "英国节点",      // 英国地区自动测速组
    "韩国节点",      // 韩国地区自动测速组
    "澳大利亚节点",  // 澳大利亚地区自动测速组
    "俄罗斯节点",    // 俄罗斯地区自动测速组
    "其他节点"       // 其他地区自动测速组（法国、德国等）
  ];
  
  /**
   * 基础备选列表
   * 用于 "节点选择" 组，防止循环引用
   * 说明：如果 "节点选择" 包含 "自动选择"，而 "自动选择" 又包含 "节点选择"，
   *       就会形成循环依赖，导致配置无法加载
   */
  const baseProxies = [
    "自动选择",      // 全局自动测速组（从所有节点中选最快的）
    "手动切换",      // 手动选择组（可以手动指定任意节点）
    ...regionProxies, // 展开所有地区节点组
    "DIRECT"         // 直连（不走代理）
  ];

  /**
   * 通用应用列表
   * 用于大多数应用分流组（如 Google、Telegram、YouTube 等）
   * 优先级：自动选择（性能优先） > 节点选择（灵活性） > 手动切换（应急）
   * 核心设计：此列表的 "自动选择" 排在第一位，确保默认优先自动测速
   */
  const appProxies = [
    "自动选择",      // 首选：自动测速选最快节点
    "节点选择",      // 备选：手动选择策略
    "手动切换",      // 应急：手动指定具体节点
    ...regionProxies, // 地区节点组（可指定特定地区）
    "DIRECT"         // 直连选项
  ];

  /**
   * AI 专用列表
   * 用于 OpenAI、Gemini、Claude 等 AI 服务
   * 优先级：美国节点（AI 服务通常有地区限制） > 日本/新加坡（备选亚太节点）
   * 设计理念：
   * 1. AI 服务（如 ChatGPT）通常对美国 IP 更友好
   * 2. 手动切换前置，方便在自动选择失败时快速切换
   * 3. 保留其他地区节点作为备选
   */
  const aiProxies = [
    "美国节点",      // 首选：AI 服务最佳地区
    "日本节点",      // 备选：亚太地区低延迟
    "新加坡节点",    // 备选：亚太地区备份
    "手动切换",      // 应急：手动救场
    "自动选择",      // 兜底：全局测速
    "节点选择",      // 策略：灵活选择
    "香港节点",      // 其他地区选项...
    "台湾节点",
    "英国节点",
    "韩国节点",
    "澳大利亚节点",
    "俄罗斯节点",
    "其他节点",
    "DIRECT"         // 直连（某些 AI 服务可能国内可访问）
  ];

  /**
   * 通用过滤规则
   * 用于从订阅中排除无效节点
   * include-all: true 表示包含所有节点
   * exclude-filter: 排除包含这些关键词的节点（通常是广告、到期提醒等）
   */
  const commonFilter = {
    "include-all": true,
    "exclude-filter": "(?i)Traffic|Expire|Premium|频道|订阅|ISP|流量|到期|重置|请勿|剩余|套餐|跳转|官网",
  };

  // ========================================================================
  // 1. 基础配置合并 (Mihomo 内核优化版)
  // ========================================================================
  
  /**
   * Mihomo/Clash Meta 内核核心配置
   * 这些配置会与原始订阅配置合并，优先级：本地配置 > 订阅配置
   */
  const yamlConfig = {
    // ---- 基础设置 ----
    "mode": "rule",              // 运行模式：rule（规则）、global（全局）、direct（直连）
    "mixed-port": 7897,          // HTTP(S) 和 SOCKS5 混合端口
    "allow-lan": false,          // 是否允许局域网连接（手机等设备通过电脑代理）
    "log-level": "info",         // 日志级别：silent、error、warning、info、debug
    "ipv6": true,                // 是否启用 IPv6
    "external-controller": "127.0.0.1:9090",  // RESTful API 控制端口（用于 Clash 面板）
    "secret": "",                // API 访问密钥（空表示不需要密码）
    
    // ---- 性能优化 ----
    "unified-delay": true,       // 统一延迟测试（更准确的延迟显示）
    "find-process-mode": "strict", // 进程匹配模式：off、strict、always
    "global-client-fingerprint": "chrome", // TLS 指纹伪装（模拟 Chrome 浏览器）

    // ---- DNS 配置 ----
    "dns": {
      "enable": true,            // 启用 DNS 解析
      "listen": ":53",           // DNS 监听端口
      "ipv6": true,              // 支持 IPv6 DNS 解析
      
      // Fake-IP 模式：虚拟 IP 解析，提升性能
      "enhanced-mode": "fake-ip", 
      "fake-ip-range": "198.18.0.1/16", // Fake-IP 地址池
      
      // Fake-IP 过滤器（黑名单模式）
      // 这些域名不使用 Fake-IP，而是返回真实 IP
      "fake-ip-filter": [
        "*.lan",                 // 局域网域名
        "*.local",               // 本地域名
        "*.arpa",                // 反向 DNS
        "time.*.com",            // 时间服务器
        "ntp.*.com",             // NTP 服务器
        "+.market.xiaomi.com",   // 小米应用商店
        "localhost.ptlogin2.qq.com", // QQ 登录
        "*.msftncsi.com",        // Windows 网络检测
        "www.msftconnecttest.com" // Windows 连接测试
      ],
      "fake-ip-filter-mode": "blacklist", // 黑名单模式（只过滤列表中的域名）
      
      // 默认 DNS 服务器（用于解析 DoH 服务器域名）
      "default-nameserver": [
        "223.5.5.5",             // 阿里云 DNS
        "119.29.29.29"           // 腾讯 DNS
      ],
      
      // 主要 DNS 服务器（加密 DNS）
      "nameserver": [
        "https://doh.pub/dns-query",        // 腾讯 DoH
        "https://dns.alidns.com/dns-query", // 阿里云 DoH
        "8.8.8.8"                           // Google DNS（备用）
      ],
      
      // 备用 DNS（当主 DNS 失败时使用）
      "fallback": [],
      
      // 备用 DNS 触发条件
      "fallback-filter": {
        "geoip": true,           // 启用 GeoIP 过滤
        "geoip-code": "CN",      // 如果返回的 IP 不是中国，则使用 fallback
        "ipcidr": ["240.0.0.0/4"] // 过滤保留 IP 段
      },
      
      // 域名分流 DNS（不同域名使用不同 DNS）
      "nameserver-policy": {
        // 国内域名使用国内 DNS
        "geosite:cn,private": [
          "https://doh.pub/dns-query",
          "https://dns.alidns.com/dns-query"
        ],
        // 国外域名使用国外 DNS
        "geosite:geolocation-!cn": [
          "https://dns.google/dns-query",
          "https://1.1.1.1/dns-query"
        ]
      }
    },
    
    // ---- TUN 模式配置 ----
    // TUN 模式：创建虚拟网卡，接管系统所有流量（类似 VPN）
    "tun": {
      "enable": true,            // 启用 TUN 模式
      "stack": "mixed",          // 网络栈：system、gvisor、mixed（推荐）
      "auto-route": true,        // 自动配置路由表
      "auto-detect-interface": true, // 自动检测出站网卡
      "dns-hijack": ["any:53"],  // 劫持 DNS 请求（确保 DNS 也走代理）
      "mtu": 1500                // 最大传输单元
    },
    
    // ---- Clash Verge 专用配置 ----
    "external-controller-pipe": "\\\\.\\pipe\\verge-mihomo" // Windows 命名管道（用于 Verge 控制）
  };

  // 将配置合并到原始 config 对象
  config = Object.assign(config, yamlConfig);

  // ========================================================================
  // 2. 规则集 (Rule Providers) 配置
  // ========================================================================
  
  /**
   * 规则集提供者工厂函数
   * @param {string} url - 规则文件的 URL
   * @param {string} path - 本地缓存路径
   * @param {string} type - 类型（http 或 file）
   * @param {string} behavior - 行为（domain、ipcidr、classical）
   * @param {string} format - 格式（text、yaml）
   * @param {number} interval - 更新间隔（秒）
   */
  const provider = (url, path, type = 'http', behavior = 'classical', format = 'text', interval = 86400) => ({
    url,       // 规则文件下载地址
    path,      // 本地缓存路径（避免重复下载）
    type,      // 获取方式
    behavior,  // 匹配行为
    format,    // 文件格式
    interval   // 更新间隔（默认 24 小时）
  });

  // 初始化 rule-providers 对象
  if (!config['rule-providers']) config['rule-providers'] = {};
  
  // ---- 规则源 CDN 地址 ----
  const aclUrl = "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/";      // ACL4SSR 规则库
  const metaUrl = "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/"; // MetaCubeX Geo 数据
  const blackUrl = "https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/"; // blackmatrix7 规则库

  /**
   * 规则集配置
   * 分类说明：
   * - 基础：局域网、去广告、解锁等通用规则
   * - AI：各类 AI 服务的分流规则
   * - 搜索：搜索引擎相关
   * - 社交/媒体：社交平台和流媒体服务
   * - 杂项：游戏平台、下载工具等
   * - 区域：国内外分流规则
   */
  config["rule-providers"] = Object.assign(config["rule-providers"], {
    // ---- 基础规则 ----
    LocalAreaNetwork: provider(`${aclUrl}LocalAreaNetwork.list`, "./ruleset/LocalAreaNetwork.list"),
    // 局域网地址（192.168.x.x、10.x.x.x 等）-> 直连
    
    UnBan: provider(`${aclUrl}UnBan.list`, "./ruleset/UnBan.list"),
    // 误杀恢复（某些被广告规则误拦截的正常域名）
    
    BanAD: provider(`${aclUrl}BanAD.list`, "./ruleset/BanAD.list"),
    // 广告拦截（主规则）
    
    BanProgramAD: provider(`${aclUrl}BanProgramAD.list`, "./ruleset/BanProgramAD.list"),
    // 应用内广告拦截（APP 广告 SDK）
    
    GoogleFCM: provider(`${aclUrl}Ruleset/GoogleFCM.list`, "./ruleset/GoogleFCM.list"),
    // Google Firebase 云消息推送
    
    GoogleCN: provider(`${aclUrl}GoogleCN.list`, "./ruleset/GoogleCN.list"),
    // Google 中国服务（可直连的 Google 服务）
    
    SteamCN: provider(`${aclUrl}Ruleset/SteamCN.list`, "./ruleset/SteamCN.list"),
    // Steam 中国 CDN（下载可直连）
    
    Microsoft: provider(`${aclUrl}Microsoft.list`, "./ruleset/Microsoft.list"),
    // 微软服务（Windows Update、Office 等）
    
    MicrosoftEdge: provider(`${blackUrl}MicrosoftEdge/MicrosoftEdge.yaml`, "./ruleset/MicrosoftEdge.yaml", 'http', 'classical', 'yaml'),
    // Edge 浏览器相关服务
    
    Apple: provider(`${aclUrl}Apple.list`, "./ruleset/Apple.list"),
    // 苹果服务（iCloud、App Store 等）
    
    WeChat: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Surge/WeChat/WeChat.list", "./ruleset/WeChat.list"),
    // 微信（含微信支付、小程序等）
    
    Adobe: provider(`${metaUrl}geosite/adobe.yaml`, "./ruleset/adobe.yaml", 'http', 'domain', 'yaml'),
    // Adobe 全家桶（Photoshop、Premiere 等）
    
    GitHub: provider(`${blackUrl}GitHub/GitHub.yaml`, "./ruleset/GitHub.yaml", 'http', 'classical', 'yaml'),
    // GitHub 及相关服务
    
    Download: provider(`${aclUrl}Download.list`, "./ruleset/Download.list"),
    // 下载工具（BT、磁力链接等）-> 建议直连
    
    // ---- 搜索引擎 ----
    Bing: provider(`${aclUrl}Bing.list`, "./ruleset/Bing.list"),
    // 必应搜索（ACL4SSR 版本）
    
    bing: provider(`${blackUrl}Bing/Bing.yaml`, "./ruleset/bing.yaml", 'http', 'classical', 'yaml'),
    // 必应搜索（blackmatrix7 版本，更详细）
    
    OneDrive: provider(`${aclUrl}OneDrive.list`, "./ruleset/OneDrive.list"),
    // OneDrive 云存储

    // ---- AI 服务 ----
    OpenAi: provider(`${blackUrl}OpenAI/OpenAI.yaml`, "./ruleset/openai.yaml", 'http', 'classical', 'yaml'),
    // OpenAI 服务（ChatGPT、API 等）- blackmatrix7 版本
    
    Openai: provider(`${metaUrl}geosite/openai.yaml`, "./ruleset/Openai.yaml", 'http', 'domain', 'yaml'),
    // OpenAI 服务 - MetaCubeX 域名版本（冗余，但保留以兼容不同规则源）
    
    Gemini: provider(`${metaUrl}geosite/google-gemini.yaml`, "./ruleset/Gemini.yaml", 'http', 'domain', 'yaml'),
    // Google Gemini AI - 域名规则
    
    gemini: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.yaml", "./ruleset/gemini.yaml", 'http', 'classical', 'yaml'),
    // Google Gemini AI - 完整规则
    
    copilot: provider(`${blackUrl}Copilot/Copilot.yaml`, "./ruleset/copilot.yaml", 'http', 'classical', 'yaml'),
    // GitHub Copilot 和 Microsoft Copilot
    
    claude: provider(`${blackUrl}Claude/Claude.yaml`, "./ruleset/claude.yaml", 'http', 'classical', 'yaml'),
    // Anthropic Claude AI
    
    bard: provider(`${blackUrl}BardAI/BardAI.yaml`, "./ruleset/bard.yaml", 'http', 'classical', 'yaml'),
    // Google Bard（Gemini 前身，可能已合并）
    
    perplexity: provider(`${metaUrl}geosite/perplexity.yaml`, "./ruleset/perplexity.yaml", 'http', 'domain', 'yaml'),
    // Perplexity AI 搜索引擎

    // ---- 社交/媒体 ----
    telegram_ip: provider(`${metaUrl}geoip/telegram.yaml`, "./ruleset/telegram_ip.yaml", 'http', 'ipcidr', 'yaml'),
    // Telegram IP 段（必须走代理，否则无法连接）
    
    telegram_domain: provider(`${metaUrl}geosite/telegram.yaml`, "./ruleset/telegram_domain.yaml", 'http', 'domain', 'yaml'),
    // Telegram 域名
    
    google_domain: provider(`${metaUrl}geosite/google.yaml`, "./ruleset/google_domain.yaml", 'http', 'domain', 'yaml'),
    // Google 全家桶域名（搜索、邮箱、云盘等）
    
    x: provider(`${blackUrl}Twitter/Twitter.yaml`, "./ruleset/x.yaml", 'http', 'classical', 'yaml'),
    // X (Twitter)
    
    Instagram: provider(`${blackUrl}Instagram/Instagram.yaml`, "./ruleset/Instagram.yaml", 'http', 'classical', 'yaml'),
    // Instagram
    
    Threads: provider(`${blackUrl}Threads/Threads.yaml`, "./ruleset/Threads.yaml", 'http', 'classical', 'yaml'),
    // Threads（Meta 的 Twitter 竞品）
    
    reddit: provider(`${metaUrl}geosite/reddit.yaml`, "./ruleset/reddit.yaml", 'http', 'domain', 'yaml'),
    // Reddit
    
    Spotify: provider(`${blackUrl}Spotify/Spotify.yaml`, "./ruleset/Spotify.yaml", 'http', 'classical', 'yaml'),
    // Spotify 音乐流媒体
    
    YouTube: provider(`${aclUrl}Ruleset/YouTube.list`, "./ruleset/YouTube.list"),
    // YouTube 视频
    
    Netflix: provider(`${aclUrl}Ruleset/Netflix.list`, "./ruleset/Netflix.list"),
    // Netflix 流媒体
    
    Bahamut: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Bahamut/Bahamut.yaml", "./ruleset/Bahamut.yaml", 'http', 'classical', 'yaml'),
    // 巴哈姆特动画疯（台湾地区限定）
    
    BilibiliHMT: provider(`${aclUrl}Ruleset/BilibiliHMT.list`, "./ruleset/BilibiliHMT.list"),
    // 哔哩哔哩港澳台（需要港澳台 IP 才能观看的内容）
    
    Bilibili: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml", "./ruleset/Bilibili.yaml", 'http', 'classical', 'yaml'),
    // 哔哩哔哩（国内版）
    
    NetEaseMusic: provider(`${aclUrl}Ruleset/NetEaseMusic.list`, "./ruleset/NetEaseMusic.list"),
    // 网易云音乐
    
    // ---- 杂项 ----
    Steam: provider(`${blackUrl}Steam/Steam.yaml`, "./ruleset/steam.yaml", 'http', 'classical', 'yaml'),
    // Steam 平台（商店、社区等）
    
    Epic: provider(`${aclUrl}Ruleset/Epic.list`, "./ruleset/Epic.list"),
    // Epic Games 商店
    
    Sony: provider(`${aclUrl}Ruleset/Sony.list`, "./ruleset/Sony.list"),
    // PlayStation Network
    
    Nintendo: provider(`${aclUrl}Ruleset/Nintendo.list`, "./ruleset/Nintendo.list"),
    // 任天堂 eShop、在线服务
    
    // ---- 区域规则 ----
    private: provider(`${metaUrl}geosite/private.yaml`, "./ruleset/private.yaml", 'http', 'domain', 'yaml'),
    // 私有域名（内网域名）
    
    cn_domain: provider(`${metaUrl}geosite/cn.yaml`, "./ruleset/cn_domain.yaml", 'http', 'domain', 'yaml'),
    // 中国域名（.cn、中文域名等）
    
    ChinaDomain: provider(`${aclUrl}ChinaDomain.list`, "./ruleset/ChinaDomain.list", 'http', 'domain'),
    // 中国常用域名（更全面）
    
    ChinaCompanyIp: provider(`${aclUrl}ChinaCompanyIp.list`, "./ruleset/ChinaCompanyIp.list", 'http', 'ipcidr'),
    // 中国公司 IP 段（阿里云、腾讯云等）
    
    "geolocation-!cn": provider(`${metaUrl}geosite/geolocation-!cn.yaml`, "./ruleset/geolocation-!cn.yaml", 'http', 'domain', 'yaml'),
    // 非中国地区的域名
    
    cn_ip: provider(`${metaUrl}geoip/cn.yaml`, "./ruleset/cn_ip.yaml", 'http', 'ipcidr', 'yaml'),
    // 中国 IP 段（CNNIC 分配）
    
    google_ip: provider(`${metaUrl}geoip/google.yaml`, "./ruleset/google_ip.yaml", 'http', 'ipcidr', 'yaml'),
    // Google IP 段
    
    freedom: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/freedom.yaml", "./ruleset/freedom.yaml", 'http', 'domain', 'yaml'),
    // 自由意志（自定义需要代理的域名）
    
    direct_cus: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/Direct_wi.yaml", "./ruleset/Direct_wi.yaml", 'http', 'domain', 'yaml'),
    // 自定义直连域名
    
    Airport: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/Airport.yaml", "./ruleset/Airport.yaml", 'http', 'domain', 'yaml'),
    // 机场/订阅站（可能需要代理访问）
    
    ChinaMedia: provider(`${aclUrl}ChinaMedia.list`, "./ruleset/ChinaMedia.list"),
    // 中国流媒体（优酷、爱奇艺等）
    
    ProxyMedia: provider(`${aclUrl}ProxyMedia.list`, "./ruleset/ProxyMedia.list"),
    // 国外流媒体（YouTube、Netflix 等综合）
    
    ProxyGFWlist: provider(`${aclUrl}ProxyGFWlist.list`, "./ruleset/ProxyGFWlist.list"),
    // GFW 列表（被墙网站）
    
    Origin: provider(`${aclUrl}Ruleset/Origin.list`, "./ruleset/Origin.list"),
    // Origin 游戏平台（EA）
  });

  // ========================================================================
  // 3. 代理组 (Proxy Groups) 配置
  // ========================================================================
  
  /**
   * 自动测速组工厂函数
   * @param {string} name - 组名
   * @param {string} regex - 正则表达式（匹配节点名称）
   * @param {string} icon - 图标 URL
   * @returns {Object} 自动测速组配置
   */
  const autoGroup = (name, regex, icon) => ({
    name,                        // 策略组名称
    type: "url-test",            // 类型：自动测速
    url: "http://www.gstatic.com/generate_204",  // 测速 URL（Google 的 204 空页面，轻量快速）
    interval: 300,               // 测速间隔：300 秒（5 分钟）
    tolerance: 50,               // 容差：延迟差小于 50ms 不切换（避免频繁切换）
    filter: regex,               // 节点过滤正则
    icon,                        // 策略组图标
    ...commonFilter              // 合并通用过滤规则
  });

  /**
   * 地区自动测速组配置
   * 每个组会自动从所有节点中筛选出对应地区的节点，并测速选择最快的
   */
  const regionGroups = [
    // 香港节点组
    // 正则说明：(?i) 表示忽略大小写，匹配包含 "香港"、"Hong Kong"、"HK"、"🇭🇰" 等关键词的节点
    autoGroup("香港节点", "(?i)香港|Hong Kong|HK|🇭🇰|hk|HongKong|hongkong", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png"),
    
    // 美国节点组
    // 匹配美国各大城市和缩写
    autoGroup("美国节点", "(?i)美国|USA|🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png"),
    
    // 台湾节点组
    autoGroup("台湾节点", "(?i)台|新北|彰化|TW|Taiwan", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png"),
    
    // 新加坡节点组
    autoGroup("新加坡节点", "(?i)新加坡|Singapore|🇸🇬|坡|狮城|SG", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png"),
    
    // 日本节点组
    autoGroup("日本节点", "(?i)日本|Japan|🇯🇵|川日|东京|大阪|泉日|埼玉|沪日|深日|JP", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png"),
    
    // 俄罗斯节点组
    autoGroup("俄罗斯节点", "(?i)俄罗斯|ru", 
      "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/flags/ru.svg"),
    
    // 英国节点组
    autoGroup("英国节点", "(?i)英国|UK|United Kingdom|London|England|GB", 
      "https://img.icons8.com/?size=100&id=15534&format=png&color=000000"),
    
    // 韩国节点组
    autoGroup("韩国节点", "(?i)KR|Korea|KOR|首尔|韩|韓", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png"),
    
    // 澳大利亚节点组
    autoGroup("澳大利亚节点", "(?i)澳大利亚|AU|澳洲|澳|Australia", 
      "https://img.icons8.com/?size=100&id=22557&format=png&color=000000"),
    
    // 奈飞专用节点组（匹配带有 "NF"、"Netflix"、"解锁" 等关键词的节点）
    autoGroup("奈飞节点", "(?i)NF|奈飞|解锁|Netflix|NETFLIX|Media", 
      "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png"),
    
    // 其他地区节点组（欧洲、南美、亚洲其他国家）
    autoGroup("其他节点", "(?i)FR|法国|MY|马来西亚|BR|巴西|CA|加拿大|ES|西班牙|IN|印度|MX|墨西哥|LU|卢森堡|TR|土耳其|IL|以色列|IT|意大利|NL|荷兰|DE|德国|CH|瑞士|TH|泰国|KZ|哈萨克斯坦", 
      "https://img.icons8.com/?size=100&id=QiwSMfboPt2R&format=png&color=000000"),
  ];

  /**
   * 代理组配置数组
   * 注意：策略组的顺序很重要，被引用的组必须在引用它的组之前定义
   */
  config["proxy-groups"] = [
    // ---- 基础选择组 ----
    
    /**
     * 节点选择组（手动选择策略）
     * 用途：作为其他策略组的备选项，提供灵活的策略切换
     * 特点：使用 baseProxies 避免循环引用
     */
    {
      name: "节点选择",
      type: "select",             // 类型：手动选择
      proxies: baseProxies,       // 可选项：自动选择、手动切换、各地区节点、直连
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png",
      ...commonFilter
    },
    
    /**
     * 手动切换组（手动选择具体节点）
     * 用途：在自动选择失败或需要指定特定节点时使用
     * 特点：包含所有地区节点组 + 通过 commonFilter 自动添加所有真实节点
     * 【新增】现在包含 regionProxies，可以快速切换到任意地区节点组
     */
    {
      name: "手动切换",
      type: "select",
      proxies: regionProxies,     // 【核心修改】添加所有地区节点组
      icon: "https://testingcf.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png",
      ...commonFilter             // 通过 include-all: true 自动包含所有订阅节点
    },
    
    /**
     * 自动选择组（全局自动测速）
     * 用途：从所有节点中自动选择延迟最低的节点
     * 特点：无地区限制，纯性能优先
     */
    {
      name: "自动选择",
      type: "url-test",           // 自动测速类型
      url: "http://www.gstatic.com/generate_204",
      interval: 300,              // 5 分钟测速一次
      tolerance: 50,              // 50ms 容差
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png",
      ...commonFilter             // 自动包含所有节点
    },
    
    // ---- AI 服务分流组 ----
    // 这些组优先使用美国节点，因为大多数 AI 服务对美国 IP 更友好
    
    /**
     * AIGC 通用 AI 组
     * 用途：兜底 AI 服务（未单独配置规则的 AI 产品）
     */
    { 
      name: "AIGC", 
      type: "select", 
      proxies: aiProxies,         // 使用 AI 专用列表（美国节点优先）
      icon: "https://img.icons8.com/?size=100&id=mSC3ebe4W6w6&format=png&color=000000" 
    },
    
    /**
     * Google Gemini AI
     * 规则：gemini.yaml + Gemini.yaml
     */
    { 
      name: "Gemini", 
      type: "select", 
      proxies: aiProxies, 
      icon: "https://img.icons8.com/?size=100&id=ETVUfl0Ylh1p&format=png&color=000000" 
    },
    
    /**
     * OpenAI (ChatGPT)
     * 规则：OpenAi.yaml + Openai.yaml
     * 建议：美国节点，部分地区可能被限制
     */
    { 
      name: "OpenAi", 
      type: "select", 
      proxies: aiProxies, 
      icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png" 
    },
    
    /**
     * Microsoft Copilot + GitHub Copilot
     * 规则：copilot.yaml
     */
    { 
      name: "Copilot", 
      type: "select", 
      proxies: aiProxies, 
      icon: "https://img.icons8.com/?size=100&id=A5L2E9lJjaSB&format=png&color=000000" 
    },
    
    /**
     * Anthropic Claude
     * 规则：claude.yaml
     */
    { 
      name: "Claude", 
      type: "select", 
      proxies: aiProxies, 
      icon: "https://img.icons8.com/?size=100&id=kDfpmWz6OSCQ&format=png&color=000000" 
    },
    
    // ---- 普通应用分流组 ----
    // 这些组使用 appProxies，默认优先自动选择（性能优先）
    
    /**
     * Google 全家桶
     * 规则：google_domain.yaml + google_ip.yaml + GoogleCN.list + GoogleFCM.list
     * 说明：包括 Google 搜索、Gmail、Google Drive、Google Photos 等
     */
    { 
      name: "谷歌", 
      type: "select", 
      proxies: appProxies,        // 优先自动选择
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google_Search.png" 
    },
    
    /**
     * Adobe 全家桶
     * 规则：adobe.yaml
     * 说明：Photoshop、Premiere、Illustrator 等需要激活验证
     */
    { 
      name: "Adobe", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/adobe.svg" 
    },
    
    /**
     * GitHub
     * 规则：GitHub.yaml
     * 说明：包括 GitHub、GitHub Pages、GitHub API 等
     */
    { 
      name: "GitHub", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://img.icons8.com/?size=100&id=LoL4bFzqmAa0&format=png&color=000000" 
    },
    
    /**
     * Telegram
     * 规则：telegram_domain.yaml + telegram_ip.yaml
     * 说明：Telegram 在中国大陆必须走代理
     */
    { 
      name: "Telegram", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png" 
    },
    
    /**
     * YouTube
     * 规则：YouTube.list
     */
    { 
      name: "YouTube", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png" 
    },
    
    /**
     * Netflix
     * 规则：Netflix.list
     * 特殊：优先使用 "奈飞节点"（专门的解锁节点）
     */
    { 
      name: "Netflix", 
      type: "select", 
      proxies: ["奈飞节点", ...appProxies],  // 奈飞节点优先
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png" 
    },
    
    /**
     * Spotify
     * 规则：Spotify.yaml
     */
    { 
      name: "Spotify", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/spotify.svg" 
    },
    
    /**
     * 国外社交平台
     * 规则：X (Twitter)、Instagram、Threads、Reddit
     * 【关键修改】引用 appProxies，确保默认优先自动选择
     */
    { 
      name: "国外社交", 
      type: "select", 
      proxies: appProxies,        // 自动选择优先
      icon: "https://img.icons8.com/?size=100&id=ZNMifeqJbPRv&format=png&color=000000" 
    },
    
    /**
     * 国外流媒体
     * 规则：ProxyMedia.list（综合流媒体规则）
     * 【关键修改】引用 appProxies
     */
    { 
      name: "国外媒体", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ForeignMedia.png" 
    },
    
    /**
     * 国内流媒体
     * 规则：ChinaMedia.list（优酷、爱奇艺、腾讯视频等）
     * 策略：优先节点选择（部分内容可能需要特定地区 IP）
     */
    { 
      name: "国内媒体", 
      type: "select", 
      proxies: ["节点选择", "自动选择", "手动切换", ...regionProxies, "DIRECT"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/DomesticMedia.png" 
    },
    
    /**
     * 微软服务
     * 规则：Microsoft.list + MicrosoftEdge.yaml + OneDrive.list + Bing.list
     * 说明：Windows Update、Office、OneDrive、Bing 等
     */
    { 
      name: "微软", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png" 
    },
    
    /**
     * 游戏平台
     * 规则：Steam、Epic、Origin、Sony、Nintendo
     * 策略：自动选择优先（低延迟重要）
     */
    { 
      name: "游戏平台", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Game.png" 
    },
    
    /**
     * 自由意志（自定义代理域名）
     * 规则：freedom.yaml（用户自定义需要走代理的域名）
     */
    { 
      name: "自由意志", 
      type: "select", 
      proxies: appProxies, 
      icon: "https://img.icons8.com/?size=100&id=kYqbEzjS6EBh&format=png&color=000000" 
    },
    
    // ---- 国内服务分流组（优先直连）----
    
    /**
     * 苹果服务
     * 规则：Apple.list（App Store、iCloud、Apple Music 等）
     * 策略：优先直连（国内有 CDN），代理作为备选
     */
    { 
      name: "苹果服务", 
      type: "select", 
      proxies: ["DIRECT", ...appProxies],  // 直连优先
      icon: "https://img.icons8.com/?size=100&id=fpDIWrTmgyvx&format=png&color=000000" 
    },
    
    /**
     * 微信
     * 规则：WeChat.list
     * 策略：优先直连（微信在国内，走代理可能影响功能）
     */
    { 
      name: "微信", 
      type: "select", 
      proxies: ["DIRECT", ...appProxies], 
      icon: "https://img.icons8.com/?size=100&id=qXin8dFXNXBX&format=png&color=000000" 
    },
    
    /**
     * 哔哩哔哩（国内版）
     * 规则：Bilibili.yaml
     * 策略：优先直连，但保留港台节点选项（部分用户可能需要）
     */
    { 
      name: "哔哩哔哩", 
      type: "select", 
      proxies: ["DIRECT", "节点选择", "自动选择", "香港节点", "台湾节点"], 
      icon: "https://img.icons8.com/?size=100&id=l87yXVtzuGWB&format=png&color=000000" 
    },
    
    /**
     * 网易云音乐
     * 规则：NetEaseMusic.list
     * 策略：优先直连
     * 特殊：通过 filter 匹配包含 "网易" 或 "音乐" 关键词的节点（解锁节点）
     */
    { 
      name: "网易音乐", 
      type: "select", 
      proxies: ["DIRECT", "节点选择", "自动选择"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netease_Music.png",
      filter: "(?i)网易|音乐|NetEase|Music",  // 匹配解锁节点
      ...commonFilter
    },
    
    // ---- 特殊服务分流组 ----
    
    /**
     * 哔哩哔哩港澳台
     * 规则：BilibiliHMT.list
     * 说明：仅港澳台地区可观看的内容（如番剧、纪录片等）
     * 策略：优先节点选择，需要港台 IP
     */
    { 
      name: "哔哩哔哩港澳台", 
      type: "select", 
      proxies: ["节点选择", "自动选择", "手动切换", "香港节点", "台湾节点", "全球直连", "DIRECT"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png" 
    },
    
    /**
     * 巴哈姆特动画疯
     * 规则：Bahamut.yaml
     * 说明：台湾地区限定的动画流媒体平台
     * 策略：优先节点选择，通常需要台湾 IP
     */
    { 
      name: "巴哈姆特", 
      type: "select", 
      proxies: ["节点选择", "手动切换", "台湾节点", "DIRECT"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png" 
    },
    
    /**
     * 机场专线
     * 规则：Airport.yaml（机场/订阅站域名）
     * 说明：订阅更新、充值等可能需要代理访问
     * 策略：优先直连（大部分机场支持国内访问），代理作为备选
     */
    { 
      name: "机场专线", 
      type: "select", 
      proxies: ["DIRECT", ...appProxies], 
      icon: "https://img.icons8.com/?size=100&id=guJpUesVT0mI&format=png&color=000000" 
    },
    
    // ---- 兜底策略组 ----
    
    /**
     * 全球直连
     * 用途：明确需要直连的流量（国内网站、局域网等）
     * 策略：优先 DIRECT，保留代理选项（某些特殊场景可能需要）
     */
    { 
      name: "全球直连", 
      type: "select", 
      proxies: ["DIRECT", "节点选择", "自动选择"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png" 
    },
    
    /**
     * 广告拦截
     * 规则：BanAD.list
     * 策略：优先 REJECT（拒绝连接），DIRECT 作为备选（调试用）
     */
    { 
      name: "广告拦截", 
      type: "select", 
      proxies: ["REJECT", "DIRECT"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png" 
    },
    
    /**
     * 应用净化
     * 规则：BanProgramAD.list（APP 内广告 SDK）
     * 策略：优先 REJECT
     */
    { 
      name: "应用净化", 
      type: "select", 
      proxies: ["REJECT", "DIRECT"], 
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hijacking.png" 
    },
    
    /**
     * 漏网之鱼（Final 兜底组）
     * 用途：捕获所有未匹配规则的流量
     * 策略：使用 appProxies（默认自动选择）
     * 说明：这是最后一道防线，通常建议走代理以避免 DNS 泄露
     */
    { 
      name: "漏网之鱼", 
      type: "select", 
      proxies: appProxies,        // 默认走代理
      icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png" 
    },
    
    // ---- 地区自动测速组 ----
    // 这些组定义在最后，因为它们不被其他组引用
    ...regionGroups               // 展开所有地区节点组（香港、美国、台湾等）
  ];

  // ========================================================================
  // 4. 分流规则 (Rules) 配置
  // ========================================================================
  
  /**
   * 规则匹配逻辑：
   * 1. 从上到下依次匹配
   * 2. 匹配成功后立即执行对应策略，不再继续匹配
   * 3. 所有规则都不匹配时，执行 MATCH（漏网之鱼）
   * 
   * 规则语法：
   * - RULE-SET,<规则集名称>,<策略组>：使用规则集
   * - GEOIP,<国家代码>,<策略组>：根据 IP 地理位置匹配
   * - MATCH,<策略组>：兜底规则，匹配所有流量
   */
  config["rules"] = [
    // ========== 第一优先级：基础网络和安全 ==========
    
    // 局域网地址直连（192.168.x.x、10.x.x.x 等）
    // 说明：局域网流量不应该走代理
    "RULE-SET,LocalAreaNetwork,全球直连",
    
    // 私有域名直连（内网域名、.local 等）
    "RULE-SET,private,DIRECT",
    
    // 误杀恢复（某些被广告规则误拦截的正常域名）
    "RULE-SET,UnBan,全球直连",
    
    // 广告拦截（主规则）
    "RULE-SET,BanAD,广告拦截",
    
    // 应用净化（APP 内广告 SDK）
    "RULE-SET,BanProgramAD,应用净化",
    
    // ========== 第二优先级：AI 服务（美国节点优先）==========
    
    // OpenAI 服务（ChatGPT、API 等）
    // 说明：使用两个规则集以确保完整覆盖
    "RULE-SET,OpenAi,OpenAi",     // blackmatrix7 版本
    "RULE-SET,Openai,OpenAi",     // MetaCubeX 版本
    
    // Google Gemini AI
    "RULE-SET,Gemini,Gemini",     // MetaCubeX 域名规则
    "RULE-SET,gemini,Gemini",     // blackmatrix7 完整规则
    
    // Anthropic Claude
    "RULE-SET,claude,Claude",
    
    // Microsoft Copilot + GitHub Copilot
    "RULE-SET,copilot,Copilot",
    
    // Google Bard（已并入 Gemini，保留兼容）
    "RULE-SET,bard,AIGC",
    
    // Perplexity AI 搜索
    "RULE-SET,perplexity,AIGC",
    
    // ========== 第三优先级：Google 全家桶 ==========
    
    // Google Firebase 云消息推送
    "RULE-SET,GoogleFCM,谷歌",
    
    // Google 域名（搜索、邮箱、云盘等）
    "RULE-SET,google_domain,谷歌",
    
    // Google IP 段
    "RULE-SET,google_ip,谷歌",
    
    // YouTube（单独规则）
    "RULE-SET,YouTube,YouTube",
    
    // Google 中国服务（可直连的部分）
    "RULE-SET,GoogleCN,谷歌",
    
    // ========== 第四优先级：社交媒体和通讯 ==========
    
    // Telegram（域名 + IP 段）
    // 说明：Telegram 在中国大陆必须走代理
    "RULE-SET,telegram_domain,Telegram",
    "RULE-SET,telegram_ip,Telegram",
    
    // X (Twitter)
    "RULE-SET,x,国外社交",
    
    // Reddit
    "RULE-SET,reddit,国外社交",
    
    // Instagram
    "RULE-SET,Instagram,国外社交",
    
    // Threads
    "RULE-SET,Threads,国外社交",
    
    // ========== 第五优先级：流媒体服务 ==========
    
    // Netflix
    "RULE-SET,Netflix,Netflix",
    
    // Spotify
    "RULE-SET,Spotify,Spotify",
    
    // 国外流媒体（综合规则，包括 Disney+、HBO 等）
    "RULE-SET,ProxyMedia,国外媒体",
    
    // ========== 第六优先级：开发工具和软件 ==========
    
    // Adobe 全家桶
    "RULE-SET,Adobe,Adobe",
    
    // GitHub
    "RULE-SET,GitHub,GitHub",
    
    // ========== 第七优先级：微软服务 ==========
    
    // Microsoft Edge 浏览器
    "RULE-SET,MicrosoftEdge,微软",
    
    // OneDrive 云存储
    "RULE-SET,OneDrive,微软",
    
    // 微软通用服务（Windows Update、Office 等）
    "RULE-SET,Microsoft,微软",
    
    // 必应搜索（两个规则集）
    "RULE-SET,bing,微软",
    "RULE-SET,Bing,微软",
    
    // ========== 第八优先级：游戏平台 ==========
    
    // Epic Games
    "RULE-SET,Epic,游戏平台",
    
    // Origin (EA)
    "RULE-SET,Origin,游戏平台",
    
    // PlayStation Network
    "RULE-SET,Sony,游戏平台",
    
    // Steam（商店、社区等，不包括下载）
    "RULE-SET,Steam,游戏平台",
    
    // 任天堂
    "RULE-SET,Nintendo,游戏平台",
    
    // ========== 第九优先级：特殊流媒体 ==========
    
    // 巴哈姆特动画疯（台湾限定）
    "RULE-SET,Bahamut,巴哈姆特",
    
    // 哔哩哔哩（国内版）
    "RULE-SET,Bilibili,哔哩哔哩",
    
    // 哔哩哔哩港澳台（地区限定内容）
    "RULE-SET,BilibiliHMT,哔哩哔哩港澳台",
    
    // 网易云音乐
    "RULE-SET,NetEaseMusic,网易音乐",
    
    // ========== 第十优先级：国内服务 ==========
    
    // 微信（含微信支付、小程序等）
    "RULE-SET,WeChat,微信",
    
    // 苹果服务
    "RULE-SET,Apple,苹果服务",
    
    // ========== 第十一优先级：自定义规则 ==========
    
    // 自由意志（用户自定义需要走代理的域名）
    "RULE-SET,freedom,自由意志",
    
    // 自定义直连域名
    "RULE-SET,direct_cus,DIRECT",
    
    // 机场/订阅站
    "RULE-SET,Airport,机场专线",
    
    // Steam 中国 CDN（下载直连，提升速度）
    "RULE-SET,SteamCN,全球直连",
    
    // ========== 第十二优先级：国内外综合分流 ==========
    
    // 中国流媒体（优酷、爱奇艺、腾讯视频等）
    "RULE-SET,ChinaMedia,国内媒体",
    
    // GFW 列表（被墙网站）
    "RULE-SET,ProxyGFWlist,节点选择",
    
    // 中国常用域名
    "RULE-SET,ChinaDomain,全球直连",
    
    // 中国公司 IP 段（阿里云、腾讯云等）
    "RULE-SET,ChinaCompanyIp,全球直连",
    
    // 非中国地区的域名
    "RULE-SET,geolocation-!cn,节点选择",
    
    // 中国域名（.cn、中文域名等）
    "RULE-SET,cn_domain,DIRECT",
    
    // 中国 IP 段（CNNIC 分配）
    "RULE-SET,cn_ip,DIRECT",
    
    // 下载工具（BT、磁力链接等）-> 直连以提升速度
    "RULE-SET,Download,全球直连",
    
    // ========== 第十三优先级：GeoIP 兜底 ==========
    
    // 中国 IP 直连（通过 GeoIP 数据库判断）
    // 说明：这是对前面规则的补充，捕获通过 IP 访问的国内服务
    "GEOIP,CN,全球直连",
    
    // ========== 最终兜底规则 ==========
    
    // 漏网之鱼（所有未匹配的流量）
    // 说明：建议走代理以避免 DNS 泄露和访问限制
    "MATCH,漏网之鱼"
  ];

  // ========================================================================
  // 返回最终配置
  // ========================================================================
  return config;
}