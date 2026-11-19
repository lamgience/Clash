/**
 * ==============================================================================
 * Clash Verge / Mihomo 覆写脚本 (Script) - 旗舰版 [全量完整版]
 * ==============================================================================
 */
export default function main(config) {
  // ========================================================================
  // [0] 预定义常量与策略逻辑
  // ========================================================================
  const regionProxies = [
    "香港节点", "澳门节点", "台湾节点", "日本节点", "韩国节点", "新加坡节点", "马来西亚节点", "泰国节点", "越南节点", "印度尼西亚节点", "菲律宾节点", "印度节点", "美国节点", "加拿大节点", "墨西哥节点", "巴西节点", "阿根廷节点", "英国节点", "德国节点", "法国节点", "荷兰节点", "瑞士节点", "意大利节点", "西班牙节点", "葡萄牙节点", "爱尔兰节点", "比利时节点", "奥地利节点", "芬兰节点", "瑞典节点", "挪威节点", "丹麦节点", "波兰节点", "捷克节点", "罗马尼亚节点", "乌克兰节点", "俄罗斯节点", "土耳其节点", "阿联酋节点", "以色列节点", "哈萨克斯坦节点", "澳大利亚节点", "新西兰节点", "南非节点",
    "其他节点"
  ];

  const baseProxies = [
    "自动选择", "手动切换",
    ...regionProxies,
    "DIRECT"
  ];

  const appProxies = [
    "自动选择", "节点选择", "手动切换",
    ...regionProxies,
    "DIRECT"
  ];

  const aiProxies = [
    ...regionProxies,
    "手动切换", "自动选择", "节点选择", "DIRECT"
  ];

  const commonFilter = {
    "include-all": true,
    "exclude-filter": "(?i)Traffic|Expire|Premium|频道|订阅|ISP|流量|到期|重置|请勿|剩余|套餐|跳转|官网|运营|更新",
  };

  // ========================================================================
  // [1] Mihomo (Meta) 内核深度配置
  // ========================================================================
  const yamlConfig = {
    "mode": "rule",
    "mixed-port": 7897,
    "log-level": "info",
    "ipv6": true,

    "unified-delay": true,
    "tcp-concurrent": true,
    "keep-alive-interval": 1800,
    "find-process-mode": "strict",

    "profile": {
      "store-selected": true
    },

    "geodata-mode": true,
    "geo-auto-update": true,
    "geo-update-interval": 24,
    "geox-url": {
      "geoip": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
      "geosite": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
      "mmdb": "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"
    },

    "sniffer": {
      "enable": true,
      "force-dns-mapping": true,
      "parse-pure-ip": true,
      "override-destination": true,
      "sniff": {
        "TLS": { "ports": [443, 8443] },
        "HTTP": { "ports": [80, 8080, 8880] },
        "QUIC": { "ports": [443, 8443, 3478, 19302] }
      },
      "skip-domain": [
        "Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com", "+.apple.com", "apple.com", "+.system.apple.com",
        "+.c.163.com", "*.music.126.net", "*.126.net", "*.122.com", "localhost", "*.local", "*.lan"
      ]
    },

    "hosts": {
      "router.asus.com": "192.168.50.1",
      "mtalk.google.com": "108.177.125.188",
      "services.googleapis.com": "172.217.163.42",
      "flash.cn": "127.0.0.1"
    },

    "ntp": {
      "enable": true,
      "server": "ntp.aliyun.com",
      "port": 123
    },

  };
  config = Object.assign(config, yamlConfig);

  // ========================================================================
  // [2] 外部规则集 (Rule Providers) 完整保留
  // ========================================================================
  const provider = (url, path, type = 'http', behavior = 'classical', format = 'text', interval = 86400) => ({
    url, path, type, behavior, format, interval
  });
  if (!config['rule-providers']) config['rule-providers'] = {};

  const aclUrl = "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/";
  const metaUrl = "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/";
  const blackUrl = "https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/";

  config["rule-providers"] = Object.assign(config["rule-providers"], {
    LocalAreaNetwork: provider(`${aclUrl}LocalAreaNetwork.list`, "./ruleset/LocalAreaNetwork.list"),
    UnBan: provider(`${aclUrl}UnBan.list`, "./ruleset/UnBan.list"),
    BanAD: provider(`${aclUrl}BanAD.list`, "./ruleset/BanAD.list"),
    BanProgramAD: provider(`${aclUrl}BanProgramAD.list`, "./ruleset/BanProgramAD.list"),
    Microsoft: provider(`${aclUrl}Microsoft.list`, "./ruleset/Microsoft.list"),
    MicrosoftEdge: provider(`${blackUrl}MicrosoftEdge/MicrosoftEdge.yaml`, "./ruleset/MicrosoftEdge.yaml", 'http', 'classical', 'yaml'),
    Apple: provider(`${aclUrl}Apple.list`, "./ruleset/Apple.list"),

    GoogleFCM: provider(`${aclUrl}Ruleset/GoogleFCM.list`, "./ruleset/GoogleFCM.list"),
    GoogleCN: provider(`${aclUrl}GoogleCN.list`, "./ruleset/GoogleCN.list"),
    google_domain: provider(`${metaUrl}geosite/google.yaml`, "./ruleset/google_domain.yaml", 'http', 'domain', 'yaml'),
    google_ip: provider(`${metaUrl}geoip/google.yaml`, "./ruleset/google_ip.yaml", 'http', 'ipcidr', 'yaml'),
    bing: provider(`${blackUrl}Bing/Bing.yaml`, "./ruleset/bing.yaml", 'http', 'classical', 'yaml'),
    Bing: provider(`${aclUrl}Bing.list`, "./ruleset/Bing.list"),
    OneDrive: provider(`${aclUrl}OneDrive.list`, "./ruleset/OneDrive.list"),

    OpenAi: provider(`${blackUrl}OpenAI/OpenAI.yaml`, "./ruleset/openai.yaml", 'http', 'classical', 'yaml'),
    Openai: provider(`${metaUrl}geosite/openai.yaml`, "./ruleset/Openai.yaml", 'http', 'domain', 'yaml'),
    Gemini: provider(`${metaUrl}geosite/google-gemini.yaml`, "./ruleset/Gemini.yaml", 'http', 'domain', 'yaml'),
    gemini: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.yaml", "./ruleset/gemini.yaml", 'http', 'classical', 'yaml'),
    copilot: provider(`${blackUrl}Copilot/Copilot.yaml`, "./ruleset/copilot.yaml", 'http', 'classical', 'yaml'),
    claude: provider(`${blackUrl}Claude/Claude.yaml`, "./ruleset/claude.yaml", 'http', 'classical', 'yaml'),
    bard: provider(`${blackUrl}BardAI/BardAI.yaml`, "./ruleset/bard.yaml", 'http', 'classical', 'yaml'),
    perplexity: provider(`${metaUrl}geosite/perplexity.yaml`, "./ruleset/perplexity.yaml", 'http', 'domain', 'yaml'),
    Cursor: provider(`${blackUrl}Cursor/Cursor.yaml`, "./ruleset/cursor.yaml", 'http', 'classical', 'yaml'),
    Grok: provider(`${blackUrl}xAI/xAI.yaml`, "./ruleset/grok.yaml", 'http', 'classical', 'yaml'),
    Midjourney: provider(`${blackUrl}Midjourney/Midjourney.yaml`, "./ruleset/midjourney.yaml", 'http', 'classical', 'yaml'),
    HuggingFace: provider(`${blackUrl}HuggingFace/HuggingFace.yaml`, "./ruleset/huggingface.yaml", 'http', 'classical', 'yaml'),

    Notion: provider(`${blackUrl}Notion/Notion.yaml`, "./ruleset/notion.yaml", 'http', 'classical', 'yaml'),
    GitHub: provider(`${blackUrl}GitHub/GitHub.yaml`, "./ruleset/GitHub.yaml", 'http', 'classical', 'yaml'),
    Adobe: provider(`${metaUrl}geosite/adobe.yaml`, "./ruleset/adobe.yaml", 'http', 'domain', 'yaml'),

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

    Speedtest: provider(`${blackUrl}Speedtest/Speedtest.yaml`, "./ruleset/speedtest.yaml", 'http', 'classical', 'yaml'),
    private: provider(`${metaUrl}geosite/private.yaml`, "./ruleset/private.yaml", 'http', 'domain', 'yaml'),
    cn_domain: provider(`${metaUrl}geosite/cn.yaml`, "./ruleset/cn_domain.yaml", 'http', 'domain', 'yaml'),
    ChinaDomain: provider(`${aclUrl}ChinaDomain.list`, "./ruleset/ChinaDomain.list", 'http', 'domain', 'text'),
    ChinaCompanyIp: provider(`${aclUrl}ChinaCompanyIp.list`, "./ruleset/ChinaCompanyIp.list", 'http', 'ipcidr'),
    "geolocation-!cn": provider(`${metaUrl}geosite/geolocation-!cn.yaml`, "./ruleset/geolocation-!cn.yaml", 'http', 'domain', 'yaml'),
    cn_ip: provider(`${metaUrl}geoip/cn.yaml`, "./ruleset/cn_ip.yaml", 'http', 'ipcidr', 'yaml'),
    freedom: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/freedom.yaml", "./ruleset/freedom.yaml", 'http', 'domain', 'yaml'),
    applications: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/applications.yaml", "./ruleset/applications.yaml", 'http', 'domain', 'yaml'),
    direct_cus: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/Direct_wi.yaml", "./ruleset/Direct_wi.yaml", 'http', 'domain', 'yaml'),
    Airport: provider("https://raw.githubusercontent.com/lamgience/Clash/refs/heads/clash_rules/Airport.yaml", "./ruleset/Airport.yaml", 'http', 'domain', 'yaml'),
    ChinaMedia: provider(`${aclUrl}ChinaMedia.list`, "./ruleset/ChinaMedia.list"),
    ProxyMedia: provider(`${aclUrl}ProxyMedia.list`, "./ruleset/ProxyMedia.list"),
    GlobalMedia: provider(`${blackUrl}GlobalMedia/GlobalMedia.yaml`, "./ruleset/globalmedia.yaml", 'http', 'classical', 'yaml'),
    ProxyGFWlist: provider(`${aclUrl}ProxyGFWlist.list`, "./ruleset/ProxyGFWlist.list"),
    Download: provider(`${aclUrl}Download.list`, "./ruleset/Download.list"),
    Docker: provider(`${blackUrl}Docker/Docker.yaml`, "./ruleset/Docker.yaml", 'http', 'classical', 'yaml'),
    Cryptocurrency: provider(`${blackUrl}Cryptocurrency/Cryptocurrency.yaml`, "./ruleset/cryptocurrency.yaml", 'http', 'classical', 'yaml'),
    DeepL: provider(`${blackUrl}DeepL/DeepL.yaml`, "./ruleset/deepl.yaml", 'http', 'classical', 'yaml'),
    Poe: provider(`${blackUrl}Poe/Poe.yaml`, "./ruleset/poe.yaml", 'http', 'classical', 'yaml'),
    Suno: provider("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Suno/Suno.yaml", "./ruleset/suno.yaml", 'http', 'classical', 'yaml'),
    Civitai: provider(`${blackUrl}Civitai/Civitai.yaml`, "./ruleset/civitai.yaml", 'http', 'classical', 'yaml'),
  });

  // ========================================================================
  // [3] 策略组 (Proxy Groups)
  // ========================================================================
  const autoGroup = (name, regex, icon, testUrl = "http://www.gstatic.com/generate_204") => ({
    name, type: "url-test", url: testUrl, interval: 300, tolerance: 50, filter: regex, icon, ...commonFilter
  });

  const regionGroups = [
    autoGroup("香港节点", "(?i)香港|Hong Kong|\\bHK\\b|🇭🇰|HongKong|HGC|WTT|HKBN|PCCW", "https://flagcdn.com/w80/hk.png"),
    autoGroup("澳门节点", "(?i)澳门|澳門|Macau|Macao|\\bMO\\b|🇲🇴", "https://flagcdn.com/w80/mo.png"),
    autoGroup("台湾节点", "(?i)台湾|臺灣|Taiwan|\\bTW\\b|🇹🇼|TaiWan|Hinet|TFN", "https://flagcdn.com/w80/tw.png"),
    autoGroup("日本节点", "(?i)日本|Japan|\\bJP\\b|🇯🇵|Tokyo|Osaka|Saitama|Kawaguchi|Nagoya|Fukuoka", "https://flagcdn.com/w80/jp.png"),
    autoGroup("韩国节点", "(?i)韩国|韓國|Korea|\\bKR\\b|🇰🇷|Seoul|KOR|Busan", "https://flagcdn.com/w80/kr.png"),
    autoGroup("新加坡节点", "(?i)新加坡|Singapore|\\bSG\\b|🇸🇬|狮城|Lion City", "https://flagcdn.com/w80/sg.png"),
    autoGroup("马来西亚节点", "(?i)马来西亚|馬來西亞|Malaysia|\\bMY\\b|🇲🇾|Kuala Lumpur|Johor", "https://flagcdn.com/w80/my.png"),
    autoGroup("泰国节点", "(?i)泰国|泰國|Thailand|\\bTH\\b|🇹🇭|Bangkok", "https://flagcdn.com/w80/th.png"),
    autoGroup("越南节点", "(?i)越南|Vietnam|\\bVN\\b|🇻🇳|Hanoi|Ho Chi Minh", "https://flagcdn.com/w80/vn.png"),
    autoGroup("印度尼西亚节点", "(?i)印度尼西亚|印尼|Indonesia|\\bID\\b|🇮🇩|Jakarta", "https://flagcdn.com/w80/id.png"),
    autoGroup("菲律宾节点", "(?i)菲律宾|菲律賓|Philippines|\\bPH\\b|🇵🇭|Manila", "https://flagcdn.com/w80/ph.png"),
    autoGroup("印度节点", "(?i)印度|India|\\bIN\\b|🇮🇳|Mumbai|Delhi|Bangalore", "https://flagcdn.com/w80/in.png"),
    autoGroup("美国节点", "(?i)美国|USA|United States|\\bUS\\b|🇺🇸|America|Los Angeles|San Jose|Silicon Valley|Seattle|Chicago|New York|Miami|Atlanta|Dallas|Fremont|Phoenix|Santa Clara|Ashburn", "https://flagcdn.com/w80/us.png"),
    autoGroup("加拿大节点", "(?i)加拿大|Canada|\\bCA\\b|🇨🇦|Toronto|Vancouver|Montreal", "https://flagcdn.com/w80/ca.png"),
    autoGroup("墨西哥节点", "(?i)墨西哥|Mexico|\\bMX\\b|🇲🇽|Mexico City", "https://flagcdn.com/w80/mx.png"),
    autoGroup("巴西节点", "(?i)巴西|Brazil|\\bBR\\b|🇧🇷|Sao Paulo|São Paulo", "https://flagcdn.com/w80/br.png"),
    autoGroup("阿根廷节点", "(?i)阿根廷|Argentina|\\bAR\\b|🇦🇷|Buenos Aires", "https://flagcdn.com/w80/ar.png"),
    autoGroup("英国节点", "(?i)英国|UK|United Kingdom|\\bGB\\b|🇬🇧|London|England|Manchester", "https://flagcdn.com/w80/gb.png"),
    autoGroup("德国节点", "(?i)德国|Germany|\\bDE\\b|🇩🇪|Frankfurt|Berlin|Munich", "https://flagcdn.com/w80/de.png"),
    autoGroup("法国节点", "(?i)法国|France|\\bFR\\b|🇫🇷|Paris|Marseille", "https://flagcdn.com/w80/fr.png"),
    autoGroup("荷兰节点", "(?i)荷兰|Netherlands|\\bNL\\b|🇳🇱|Amsterdam|Rotterdam", "https://flagcdn.com/w80/nl.png"),
    autoGroup("瑞士节点", "(?i)瑞士|Switzerland|\\bCH\\b|🇨🇭|Zurich|Geneva", "https://flagcdn.com/w80/ch.png"),
    autoGroup("意大利节点", "(?i)意大利|Italy|\\bIT\\b|🇮🇹|Milan|Rome", "https://flagcdn.com/w80/it.png"),
    autoGroup("西班牙节点", "(?i)西班牙|Spain|\\bES\\b|🇪🇸|Madrid|Barcelona", "https://flagcdn.com/w80/es.png"),
    autoGroup("葡萄牙节点", "(?i)葡萄牙|Portugal|\\bPT\\b|🇵🇹|Lisbon", "https://flagcdn.com/w80/pt.png"),
    autoGroup("爱尔兰节点", "(?i)爱尔兰|Ireland|\\bIE\\b|🇮🇪|Dublin", "https://flagcdn.com/w80/ie.png"),
    autoGroup("比利时节点", "(?i)比利时|比利時|Belgium|\\bBE\\b|🇧🇪|Brussels", "https://flagcdn.com/w80/be.png"),
    autoGroup("奥地利节点", "(?i)奥地利|奧地利|Austria|\\bAT\\b|🇦🇹|Vienna", "https://flagcdn.com/w80/at.png"),
    autoGroup("芬兰节点", "(?i)芬兰|芬蘭|Finland|\\bFI\\b|🇫🇮|Helsinki", "https://flagcdn.com/w80/fi.png"),
    autoGroup("瑞典节点", "(?i)瑞典|Sweden|\\bSE\\b|🇸🇪|Stockholm", "https://flagcdn.com/w80/se.png"),
    autoGroup("挪威节点", "(?i)挪威|Norway|\\bNO\\b|🇳🇴|Oslo", "https://flagcdn.com/w80/no.png"),
    autoGroup("丹麦节点", "(?i)丹麦|丹麥|Denmark|\\bDK\\b|🇩🇰|Copenhagen", "https://flagcdn.com/w80/dk.png"),
    autoGroup("波兰节点", "(?i)波兰|波蘭|Poland|\\bPL\\b|🇵🇱|Warsaw", "https://flagcdn.com/w80/pl.png"),
    autoGroup("捷克节点", "(?i)捷克|Czech|Czechia|\\bCZ\\b|🇨🇿|Prague", "https://flagcdn.com/w80/cz.png"),
    autoGroup("罗马尼亚节点", "(?i)罗马尼亚|羅馬尼亞|Romania|\\bRO\\b|🇷🇴|Bucharest", "https://flagcdn.com/w80/ro.png"),
    autoGroup("乌克兰节点", "(?i)乌克兰|烏克蘭|Ukraine|\\bUA\\b|🇺🇦|Kyiv", "https://flagcdn.com/w80/ua.png"),
    autoGroup("俄罗斯节点", "(?i)俄罗斯|俄羅斯|Russia|\\bRU\\b|🇷🇺|Moscow|Saint Petersburg", "https://flagcdn.com/w80/ru.png"),
    autoGroup("土耳其节点", "(?i)土耳其|土耳其|Turkey|\\bTR\\b|🇹🇷|Istanbul|Ankara", "https://flagcdn.com/w80/tr.png"),
    autoGroup("阿联酋节点", "(?i)阿联酋|阿聯酋|UAE|United Arab Emirates|\\bAE\\b|🇦🇪|Dubai|Abu Dhabi", "https://flagcdn.com/w80/ae.png"),
    autoGroup("以色列节点", "(?i)以色列|Israel|\\bIL\\b|🇮🇱|Tel Aviv", "https://flagcdn.com/w80/il.png"),
    autoGroup("哈萨克斯坦节点", "(?i)哈萨克斯坦|哈薩克斯坦|Kazakhstan|\\bKZ\\b|🇰🇿|Almaty", "https://flagcdn.com/w80/kz.png"),
    autoGroup("澳大利亚节点", "(?i)澳大利亚|澳洲|Australia|\\bAU\\b|🇦🇺|Sydney|Melbourne|Brisbane|Perth", "https://flagcdn.com/w80/au.png"),
    autoGroup("新西兰节点", "(?i)新西兰|紐西蘭|New Zealand|\\bNZ\\b|🇳🇿|Auckland|Wellington", "https://flagcdn.com/w80/nz.png"),
    autoGroup("南非节点", "(?i)南非|South Africa|\\bZA\\b|🇿🇦|Johannesburg|Cape Town", "https://flagcdn.com/w80/za.png"),
    autoGroup("奈飞节点", "(?i)NF|奈飞|解锁|Netflix|NETFLIX|Media", "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png", "https://www.netflix.com"),
    autoGroup("其他节点", "(?i)其他|Other|Others|备用|未分类|Unknown|Unclassified", "https://img.icons8.com/?size=100&id=QiwSMfboPt2R&format=png&color=000000"),
  ];

  config["proxy-groups"] = [
    { name: "节点选择", type: "select", proxies: baseProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png", ...commonFilter },
    { name: "手动切换", type: "select", proxies: [...regionProxies], icon: "https://testingcf.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png", ...commonFilter },
    { name: "自动选择", type: "url-test", url: "http://www.gstatic.com/generate_204", interval: 300, tolerance: 50, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Auto.png", ...commonFilter },
    
    { name: "AIGC", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=mSC3ebe4W6w6&format=png&color=000000", ...commonFilter },
    { name: "Gemini", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=ETVUfl0Ylh1p&format=png&color=000000", ...commonFilter },
    { name: "Google AI Labs", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=unXm4ixWAr6H&format=png&color=000000", ...commonFilter },
    { name: "Google Antigravity", type: "select", proxies: aiProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google_Search.png", ...commonFilter },
    { name: "OpenAi", type: "select", proxies: aiProxies, icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/OpenAI.png", ...commonFilter },
    { name: "Copilot", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=A5L2E9lJjaSB&format=png&color=000000", ...commonFilter },
    { name: "Claude", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=kDfpmWz6OSCQ&format=png&color=000000", ...commonFilter },
    { name: "Perplexity", type: "select", proxies: aiProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/perplexity.png", ...commonFilter },
    { name: "Cursor", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=DiGZkjCzyZXn&format=png&color=000000", ...commonFilter },
    { name: "Grok", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=USGXKHXKl9X7&format=png&color=000000", ...commonFilter },
    { name: "Midjourney", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=PBeVLDM6af80&format=png&color=000000", ...commonFilter },
    { name: "HuggingFace", type: "select", proxies: aiProxies, icon: "https://img.icons8.com/?size=100&id=LMTLvMIHsh1F&format=png&color=000000", ...commonFilter },
    { name: "DeepL", type: "select", proxies: aiProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/deepl.png", ...commonFilter },
    { name: "Poe", type: "select", proxies: aiProxies, icon: "https://www.google.com/s2/favicons?domain=poe.com&sz=128", ...commonFilter },
    { name: "Suno", type: "select", proxies: aiProxies, icon: "https://www.google.com/s2/favicons?domain=suno.com&sz=128", ...commonFilter },
    { name: "Civitai", type: "select", proxies: aiProxies, icon: "https://www.google.com/s2/favicons?domain=civitai.com&sz=128", ...commonFilter },

    { name: "Notion", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Notion.png", ...commonFilter },
    { name: "GitHub", type: "select", proxies: appProxies, icon: "https://img.icons8.com/?size=100&id=LoL4bFzqmAa0&format=png&color=000000", ...commonFilter },
    { name: "Docker", type: "select", proxies: appProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png", ...commonFilter },
    { name: "Adobe", type: "select", proxies: appProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/adobe.svg", ...commonFilter },
    { name: "微软", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png", ...commonFilter },
    { name: "谷歌", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google_Search.png", ...commonFilter },

    { name: "Discord", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Discord.png", ...commonFilter },
    { name: "Telegram", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Orz-3/mini@master/Color/Telegram.png", ...commonFilter },
    { name: "国外社交", type: "select", proxies: appProxies, icon: "https://img.icons8.com/?size=100&id=ZNMifeqJbPRv&format=png&color=000000", ...commonFilter },
    { name: "国外媒体", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ForeignMedia.png", ...commonFilter },
    { name: "YouTube", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png", ...commonFilter },
    { name: "Netflix", type: "select", proxies: ["奈飞节点", ...appProxies], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png", ...commonFilter },
    { name: "Spotify", type: "select", proxies: appProxies, icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/spotify.svg", ...commonFilter },

    { name: "游戏平台", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Game.png", ...commonFilter },
    { name: "自由意志", type: "select", proxies: appProxies, icon: "https://img.icons8.com/?size=100&id=kYqbEzjS6EBh&format=png&color=000000", ...commonFilter },
    { name: "应用专用", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Windows.png", ...commonFilter },

    { name: "国内媒体", type: "select", proxies: ["节点选择", "自动选择", "手动切换", ...regionProxies, "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/DomesticMedia.png", ...commonFilter },
    { name: "苹果服务", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=fpDIWrTmgyvx&format=png&color=000000", ...commonFilter },
    { name: "微信", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://img.icons8.com/?size=100&id=qXin8dFXNXBX&format=png&color=000000", ...commonFilter },
    { name: "哔哩哔哩", type: "select", proxies: ["DIRECT", "节点选择", "自动选择", "香港节点", "台湾节点"], icon: "https://img.icons8.com/?size=100&id=l87yXVtzuGWB&format=png&color=000000", ...commonFilter },
    { name: "网易音乐", type: "select", proxies: ["DIRECT", "节点选择", "自动选择"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netease_Music.png", filter: "(?i)网易|音乐|NetEase|Music", ...commonFilter },

    { name: "哔哩哔哩港澳台", type: "select", proxies: ["节点选择", "自动选择", "手动切换", "香港节点", "台湾节点", "全球直连", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png", ...commonFilter },
    { name: "巴哈姆特", type: "select", proxies: ["节点选择", "手动切换", "台湾节点", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png", ...commonFilter },
    { name: "机场专线", type: "select", proxies: ["DIRECT", ...appProxies], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Airport.png", ...commonFilter },
    { name: "全球直连", type: "select", proxies: ["DIRECT", "节点选择", "自动选择"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png", ...commonFilter },
    { name: "加密货币", type: "select", proxies: ["新加坡节点", "台湾节点", "日本节点", "手动切换", "DIRECT"], icon: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/bitcoin.png" },
    { name: "广告拦截", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png" },
    { name: "应用净化", type: "select", proxies: ["REJECT", "DIRECT"], icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hijacking.png" },
    { name: "漏网之鱼", type: "select", proxies: appProxies, icon: "https://testingcf.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png", ...commonFilter },

    ...regionGroups
  ];

  // ========================================================================
  // [4] 分流规则 (Rules)
  // ========================================================================
  config["rules"] = [
    // --- 优先级 0: 强制时间同步直连 (防阻断) ---
    "DST-PORT,123,DIRECT",

    // --- 优先级 1: 局域网、隐私与广告拦截 ---
    "RULE-SET,LocalAreaNetwork,全球直连",
    "RULE-SET,private,DIRECT",
    "RULE-SET,UnBan,全球直连",
    "RULE-SET,BanAD,广告拦截",
    "RULE-SET,BanProgramAD,应用净化",

    // --- 优先级 2: AI 服务 (高优先级，防止误走其他代理) ---
    "PROCESS-NAME,Antigravity.exe,Google Antigravity",
    "PROCESS-NAME,DX OS.exe,应用专用",
    "RULE-SET,applications,应用专用",
    "DOMAIN,labs.google,Google AI Labs",
    "DOMAIN-SUFFIX,labs.google.com,Google AI Labs",
    "DOMAIN,labs.google.com,Google AI Labs",
    // Antigravity and shared Code Assist hosts must precede Gemini/Google providers.
    "DOMAIN-SUFFIX,antigravity.google,Google Antigravity",
    "DOMAIN-SUFFIX,antigravity.google.com,Google Antigravity",
    "DOMAIN-SUFFIX,antigravity-unleash.goog,Google Antigravity",
    "DOMAIN,antigravity-pa.googleapis.com,Google Antigravity",
    "DOMAIN,antigravity.googleapis.com,Google Antigravity",
    "DOMAIN,cloudcode-pa.googleapis.com,Google Antigravity",
    "DOMAIN,daily-cloudcode-pa.googleapis.com,Google Antigravity",
    "DOMAIN,aicode.googleapis.com,Google Antigravity",
    // Gemini Enterprise endpoints documented for Antigravity.
    "DOMAIN,businessaicode.googleapis.com,Google Antigravity",
    "DOMAIN,businessaicode.us.rep.googleapis.com,Google Antigravity",
    "DOMAIN,businessaicode.eu.rep.googleapis.com,Google Antigravity",
    "DOMAIN,businessaicode.mtls.googleapis.com,Google Antigravity",
    "DOMAIN,aiplatform.googleapis.com,Google Antigravity",
    "DOMAIN,aiplatform.us.rep.googleapis.com,Google Antigravity",
    "DOMAIN,aiplatform.eu.rep.googleapis.com,Google Antigravity",
    "DOMAIN,aiplatform.mtls.googleapis.com,Google Antigravity",
    "DOMAIN,discoveryengine.googleapis.com,Google Antigravity",
    "DOMAIN,us-discoveryengine.googleapis.com,Google Antigravity",
    "DOMAIN,eu-discoveryengine.googleapis.com,Google Antigravity",
    "DOMAIN,discoveryengine.mtls.googleapis.com,Google Antigravity",
    "DOMAIN,us-discoveryengine.mtls.googleapis.com,Google Antigravity",
    "DOMAIN,eu-discoveryengine.mtls.googleapis.com,Google Antigravity",
    "RULE-SET,Gemini,Gemini",
    "RULE-SET,gemini,Gemini",
    "RULE-SET,OpenAi,OpenAi",
    "RULE-SET,Openai,OpenAi",
    "RULE-SET,claude,Claude",
    "RULE-SET,copilot,Copilot",
    "RULE-SET,bard,AIGC",
    "RULE-SET,perplexity,Perplexity",
    "RULE-SET,DeepL,DeepL",
    "RULE-SET,Poe,Poe",
    "RULE-SET,Suno,Suno",
    "RULE-SET,Civitai,Civitai",
    "RULE-SET,Cursor,Cursor",
    "RULE-SET,Grok,Grok",
    "RULE-SET,Midjourney,Midjourney",
    "RULE-SET,HuggingFace,HuggingFace",

    // --- 优先级 3: 核心服务 (Google/Microsoft) ---
    "RULE-SET,YouTube,YouTube",
    "RULE-SET,GoogleFCM,谷歌",
    "RULE-SET,google_domain,谷歌",
    "RULE-SET,google_ip,谷歌",
    "RULE-SET,GoogleCN,谷歌",
    "RULE-SET,MicrosoftEdge,微软",
    "RULE-SET,OneDrive,微软",
    "RULE-SET,Microsoft,微软",
    "RULE-SET,bing,微软",
    "RULE-SET,Bing,微软",

    // --- 优先级 4: 生产力与开发 ---
    "RULE-SET,Notion,Notion",
    "RULE-SET,GitHub,GitHub",
    "RULE-SET,Docker,Docker",
    "RULE-SET,Adobe,Adobe",

    // --- 优先级 5: 社交网络 ---
    "RULE-SET,Discord,Discord",
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
    "RULE-SET,ChinaMedia,国内媒体",
    "RULE-SET,BilibiliHMT,哔哩哔哩港澳台",
    "RULE-SET,NetEaseMusic,网易音乐",

    // --- 优先级 8: 直连服务与工具 ---
    "RULE-SET,Speedtest,全球直连",
    "RULE-SET,Cryptocurrency,加密货币",
    "RULE-SET,WeChat,微信",
    "RULE-SET,Apple,苹果服务",
    "RULE-SET,freedom,自由意志",
    "RULE-SET,direct_cus,DIRECT",
    "RULE-SET,Airport,机场专线",
    "RULE-SET,SteamCN,全球直连",
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
  // Nyanpasu compatibility: expand include-all/filter into explicit node lists.
  const proxyNames = Array.isArray(config.proxies)
    ? [...new Set(config.proxies
      .map((p) => typeof p === "string" ? p : p?.name)
      .filter((name) => typeof name === "string" && name.trim()))]
    : [];
  for (const key of [
    "unified-delay", "tcp-concurrent", "keep-alive-interval", "find-process-mode",
    "profile", "geodata-mode", "geo-auto-update", "geo-update-interval", "geox-url",
    "sniffer", "hosts", "ntp", "dns", "tun"
  ]) delete config[key];
  const excluded = /Traffic|Expire|Premium|频道|订阅|ISP|流量|到期|重置|请勿|剩余|套餐|跳转|官网|运营|更新/i;
  for (const group of config["proxy-groups"] || []) {
    const filter = typeof group.filter === "string" ? group.filter.replace(/^\(\?i\)/, "") : null;
    let matcher = null;
    if (filter) {
      try { matcher = new RegExp(filter, "i"); } catch (_) { matcher = null; }
    }
    const matched = filter
      ? (matcher ? proxyNames.filter((name) => matcher.test(name) && !excluded.test(name)) : [])
      : (group["include-all"] ? proxyNames.filter((name) => !excluded.test(name)) : []);
    if (group["include-all"] || filter) {
      group.proxies = [...new Set([
        ...(Array.isArray(group.proxies) ? group.proxies : []),
        ...matched
      ])];
      if (!group.proxies.length) group.proxies = ["DIRECT"];
      delete group["include-all"];
      delete group["exclude-filter"];
      delete group.filter;
    }
  }

  const availableProxyNames = Array.isArray(config.proxies) ? [...new Set(config.proxies.map((p) => typeof p === "string" ? p : p?.name).filter((n) => typeof n === "string" && n.trim()))] : null;
  const countryGroupNames = new Set((config["proxy-groups"] || []).map((g) => g.name).filter((name) => typeof name === "string" && /节点$/.test(name) && !["奈飞节点", "其他节点"].includes(name)));
  if (availableProxyNames) {
    const excludedNames = /Traffic|Expire|Premium|频道|订阅|ISP|流量|到期|重置|请勿|剩余|套餐|跳转|官网|运营|更新/i;
    const emptyCountryGroups = new Set();
    for (const group of config["proxy-groups"] || []) {
      if (!countryGroupNames.has(group.name)) continue;
      const filter = typeof group.filter === "string" ? group.filter.replace(/^\(\?i\)/, "") : "";
      let matched = [];
      if (filter) { try { matched = availableProxyNames.filter((name) => new RegExp(filter, "i").test(name) && !excludedNames.test(name)); } catch (_) {} }
      else matched = (group.proxies || []).filter((name) => availableProxyNames.includes(name));
      if (!matched.length) emptyCountryGroups.add(group.name);
    }
    if (emptyCountryGroups.size) config["proxy-groups"] = (config["proxy-groups"] || []).filter((g) => !emptyCountryGroups.has(g.name)).map((g) => { if (Array.isArray(g.proxies)) g.proxies = g.proxies.filter((n) => !emptyCountryGroups.has(n)); return g; });
  }
  const groupPriority = ["节点选择", "自动选择", "手动切换", "AIGC", "Google AI Labs", "Google Antigravity", "Gemini", "OpenAi", "Copilot", "Claude", "Perplexity", "Cursor", "Grok", "Midjourney", "HuggingFace", "DeepL", "Poe", "Suno", "Civitai", "Notion", "GitHub", "Docker", "Adobe", "微软", "谷歌", "应用专用", "机场专线", "自由意志", "Discord", "Telegram", "国外社交", "国外媒体", "YouTube", "Netflix", "Spotify", "游戏平台", "国内媒体", "苹果服务", "微信", "哔哩哔哩", "哔哩哔哩港澳台", "巴哈姆特", "网易音乐", "加密货币", ...[...countryGroupNames], "奈飞节点", "其他节点", "全球直连", "广告拦截", "应用净化", "漏网之鱼"];
  const priorityIndex = new Map(groupPriority.map((name, index) => [name, index]));
  config["proxy-groups"] = (config["proxy-groups"] || []).map((group, index) => ({ group, index })).sort((a, b) => (priorityIndex.get(a.group.name) ?? 9999) - (priorityIndex.get(b.group.name) ?? 9999) || a.index - b.index).map(({ group }) => group);

  return config;
}
