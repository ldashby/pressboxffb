// ═════════════════════════════════════════════════════════════════
// DATA — 2026 predraft seed players, sources, news, etc.
// ═════════════════════════════════════════════════════════════════

// 2026 board: ADP sorted. Weekly numbers here = 2025 final season fantasy pts/game
// arc (or 0 for injury/DNP weeks) — shown in the drawer as prior-year context.

const SEED_PLAYERS = [
  {name:"Ja'Marr Chase",pos:"WR",team:"CIN",rank:1,posRk:1,tier:1,bye:10,score:98,trend:+1,own:100,note:"Triple Crown reigning champ. Burrow healthy, contract settled, Higgins gone — uncontested alpha.",factors:["Alpha WR","Target Hog","PPR+"],adp:1.2,weekly:[28,24,31,26,22,0,29,25,32,27,24,21,28,30,26,24,29,27]},
  {name:"Bijan Robinson",pos:"RB",team:"ATL",rank:2,posRk:1,tier:1,bye:5,score:97,trend:0,own:100,note:"Unquestioned three-down back. Penix Year 2 should lift goal-line rate. RB1 overall.",factors:["GL RB1","3-Down","Elite OL"],adp:2.1,weekly:[24,21,28,26,19,24,22,0,29,25,23,27,24,21,26,24,22,26]},
  {name:"Jahmyr Gibbs",pos:"RB",team:"DET",rank:3,posRk:2,tier:1,bye:8,score:95,trend:+2,own:100,note:"Montgomery departing Detroit cements the backfield. Receiving-back scoring profile.",factors:["Pass Catcher","Explosive","PPR+"],adp:2.8,weekly:[22,28,24,19,26,24,0,30,21,25,27,23,28,22,26,24,21,28]},
  {name:"Saquon Barkley",pos:"RB",team:"PHI",rank:4,posRk:3,tier:1,bye:9,score:93,trend:-1,own:100,note:"Age-28 TD regression is the only knock. Same elite OL, same Hurts script.",factors:["Elite OL","Workhorse"],adp:3.4,weekly:[30,25,18,0,22,28,31,19,24,26,21,17,23,29,18,25,22,20]},
  {name:"Justin Jefferson",pos:"WR",team:"MIN",rank:5,posRk:2,tier:1,bye:6,score:94,trend:0,own:99,note:"McCarthy Year 2 jump expected. Target share stays WR1-elite regardless.",factors:["Alpha WR","Target Hog"],adp:4.1,weekly:[26,24,17,22,19,0,28,30,18,23,25,21,16,19,24,27,22,20]},
  {name:"CeeDee Lamb",pos:"WR",team:"DAL",rank:6,posRk:3,tier:1,bye:10,score:92,trend:-1,own:99,note:"Dak healthy again, but Pickens addition may cap target share closer to 29%.",factors:["Elite OL","PPR+"],adp:5.3,weekly:[22,18,26,31,0,19,24,28,21,17,29,22,16,25,20,30,18,24]},
  {name:"Malik Nabers",pos:"WR",team:"NYG",rank:7,posRk:4,tier:1,bye:14,score:90,trend:+4,own:99,note:"Rookie year 170 targets despite QB carousel. Dart takeover = efficiency jump.",factors:["Target Hog","Breakout"],adp:6.8,weekly:[22,27,19,24,0,0,25,21,29,17,23,28,20,22,26,18,24,20]},
  {name:"Brian Thomas Jr.",pos:"WR",team:"JAX",rank:8,posRk:5,tier:2,bye:8,score:89,trend:+5,own:98,note:"Breakout rookie now the unquestioned JAX alpha. Deep-ball ceiling rare at this cost.",factors:["Alpha WR","Deep Threat","Breakout"],adp:7.9,weekly:[19,24,28,21,17,24,0,26,22,18,25,23,27,20,22,25,19,24]},
  {name:"Puka Nacua",pos:"WR",team:"LAR",rank:9,posRk:6,tier:2,bye:6,score:88,trend:+2,own:98,note:"Kupp out of LAR solidifies alpha role. Stafford keeps the pass volume.",factors:["Target Hog","Slot"],adp:9.2,weekly:[22,18,26,19,21,0,24,28,17,23,25,19,22,18,24,21,19,22]},
  {name:"Amon-Ra St. Brown",pos:"WR",team:"DET",rank:10,posRk:7,tier:2,bye:8,score:87,trend:0,own:97,note:"Safest WR floor in football. 160+ targets the last three seasons.",factors:["Floor","Slot","PPR+"],adp:10.6,weekly:[24,21,23,19,22,20,0,24,17,22,19,25,21,18,23,19,22,20]},
  {name:"Christian McCaffrey",pos:"RB",team:"SF",rank:11,posRk:4,tier:2,bye:14,score:82,trend:-2,own:95,note:"Full offseason ramp after the lost 2025. Age-29 red flag but usage is still elite.",factors:["Returning","Inj Risk"],adp:12.4,weekly:[0,0,0,18,22,24,26,19,21,25,17,23,20,0,22,19,18,24]},
  {name:"Drake London",pos:"WR",team:"ATL",rank:12,posRk:8,tier:2,bye:5,score:85,trend:+3,own:96,note:"Penix Year 2 + cemented WR1 role. Red-zone volume leader on the roster.",factors:["Red Zone","Alpha WR"],adp:13.8,weekly:[19,17,22,24,18,20,21,0,23,17,19,22,20,18,24,21,19,22]},
  {name:"Ashton Jeanty",pos:"RB",team:"LV",rank:13,posRk:5,tier:2,bye:10,score:86,trend:+6,own:97,note:"Rookie workhorse. Boise State production translates — Raiders have zero backfield competition.",factors:["Workhorse","Rookie","Breakout"],adp:14.5,weekly:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
  {name:"Derrick Henry",pos:"RB",team:"BAL",rank:14,posRk:6,tier:2,bye:7,score:83,trend:-2,own:95,note:"Age-32 in December. 2,000-yard pace finally hit a cliff late '25 — discount this year.",factors:["GL RB1","Aging"],adp:16.2,weekly:[22,18,24,15,20,23,17,21,0,19,22,24,18,22,19,21,17,20]},
  {name:"Josh Allen",pos:"QB",team:"BUF",rank:15,posRk:1,tier:1,bye:7,score:93,trend:0,own:94,note:"Reigning MVP. Rushing floor untouchable. QB1 overall for the fourth straight year.",factors:["Rush TD","SF+"],adp:17.8,weekly:[26,32,24,28,22,30,0,25,29,27,21,24,26,31,22,28,25,30]},
  {name:"Lamar Jackson",pos:"QB",team:"BAL",rank:16,posRk:2,tier:1,bye:7,score:92,trend:+1,own:93,note:"Back-to-back QB2 finishes. Zay Flowers ascending is the leverage.",factors:["Rush TD","SF+"],adp:19.4,weekly:[28,30,22,26,32,24,27,21,25,0,29,26,28,23,27,25,22,30]},
  {name:"Jayden Daniels",pos:"QB",team:"WAS",rank:17,posRk:3,tier:1,bye:14,score:91,trend:+3,own:92,note:"ROY with a full playbook coming. McLaurin + Samuel + TE1 upgrade coming.",factors:["Rush TD","SF+"],adp:21.1,weekly:[22,28,19,24,26,0,21,25,23,20,27,24,22,19,26,23,25,22]},
  {name:"Garrett Wilson",pos:"WR",team:"NYJ",rank:18,posRk:9,tier:3,bye:9,score:83,trend:+2,own:93,note:"Justin Fields era unlocks the deep ball. 150-target floor again regardless.",factors:["Target Hog"],adp:22.8,weekly:[21,17,24,19,22,0,23,18,25,20,17,22,19,24,21,18,22,20]},
  {name:"Tyreek Hill",pos:"WR",team:"MIA",rank:19,posRk:10,tier:3,bye:6,score:80,trend:-4,own:92,note:"Age-32. Yardage cliff was real in '25. YAC still elite but WR1 ceiling is gone.",factors:["YAC","Aging"],adp:24.1,weekly:[19,23,15,22,0,18,24,16,21,19,17,23,15,20,18,22,19,17]},
  {name:"Nico Collins",pos:"WR",team:"HOU",rank:20,posRk:11,tier:3,bye:14,score:84,trend:+2,own:93,note:"Stroud's unquestioned WR1 after Dell/Diggs exits. Every-down alpha when healthy.",factors:["Alpha WR"],adp:25.6,weekly:[22,24,17,19,0,21,24,0,19,22,17,15,20,18,16,19,21,24]},
  {name:"Brock Bowers",pos:"TE",team:"LV",rank:21,posRk:1,tier:1,bye:10,score:86,trend:+4,own:94,note:"TE1 by a canyon after rookie record for TE targets. Geno Smith upgrade under center.",factors:["Target Hog","Red Zone"],adp:27.2,weekly:[16,14,20,18,15,12,19,0,22,16,14,18,17,15,19,17,14,16]},
  {name:"De'Von Achane",pos:"RB",team:"MIA",rank:22,posRk:7,tier:3,bye:6,score:81,trend:+1,own:91,note:"PPR cheat code. Workload creeping into true lead-back territory when healthy.",factors:["Explosive","Pass Catcher"],adp:28.7,weekly:[18,24,21,15,0,22,19,25,17,20,23,18,22,15,19,22,18,21]},
  {name:"Omarion Hampton",pos:"RB",team:"LAC",rank:23,posRk:8,tier:3,bye:5,score:79,trend:+8,own:88,note:"North Carolina rookie. LAC drafted to replace Dobbins. Harbaugh = run-heavy.",factors:["Workhorse","Rookie"],adp:30.4,weekly:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
  {name:"Jonathan Taylor",pos:"RB",team:"IND",rank:24,posRk:9,tier:3,bye:14,score:78,trend:+2,own:89,note:"Richardson locked in Year 3. JT back to 280+ touches projection.",factors:["Workhorse"],adp:32.1,weekly:[20,22,17,19,0,15,21,24,16,20,14,19,17,22,15,18,16,20]},
  {name:"Bucky Irving",pos:"RB",team:"TB",rank:25,posRk:10,tier:3,bye:11,score:77,trend:+6,own:87,note:"Took over TB backfield end of '25. Full three-down role penciled in for '26.",factors:["Pass Catcher","Breakout"],adp:34.3,weekly:[12,15,19,16,22,0,24,18,21,17,23,19,22,25,18,21,17,20]},
  {name:"Kenneth Walker III",pos:"RB",team:"SEA",rank:26,posRk:11,tier:4,bye:8,score:74,trend:0,own:85,note:"Zach Charbonnet splits cap the ceiling, but TD equity is there.",factors:["TD Machine"],adp:36.8,weekly:[15,19,14,17,0,15,18,14,16,19,15,17,20,14,17,15,19,16]},
  {name:"Jalen Hurts",pos:"QB",team:"PHI",rank:27,posRk:4,tier:2,bye:9,score:85,trend:-1,own:88,note:"Tush push TDs capped by Brown/Smith target competition. Still a top-6 QB.",factors:["GL TD","Rush TD"],adp:38.2,weekly:[21,19,0,25,23,27,20,24,22,18,26,21,24,22,20,23,19,22]},
  {name:"Trey McBride",pos:"TE",team:"ARI",rank:28,posRk:2,tier:1,bye:11,score:80,trend:+2,own:86,note:"TE target-share king. Harrison Jr. Year 2 bump should lift whole offense.",factors:["Target Hog","Floor"],adp:40.7,weekly:[14,18,12,0,16,19,14,17,15,13,16,14,18,15,17,14,16,15]},
  {name:"Travis Hunter",pos:"WR",team:"JAX",rank:29,posRk:12,tier:4,bye:8,score:76,trend:+10,own:84,note:"Heisman rookie. JAX planning 80% offensive snaps. Upside pick of the draft.",factors:["Rookie","Breakout","Deep Threat"],adp:42.5,weekly:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
  {name:"Breece Hall",pos:"RB",team:"NYJ",rank:30,posRk:12,tier:4,bye:9,score:73,trend:-3,own:83,note:"Fields + new OC unknowns. Braelon Allen committee risk is real this summer.",factors:["Volume","Inj Risk"],adp:44.6,weekly:[17,22,19,24,16,21,18,25,0,20,14,23,18,22,19,21,17,20]},
  {name:"Kyren Williams",pos:"RB",team:"LAR",rank:31,posRk:13,tier:4,bye:6,score:71,trend:-2,own:81,note:"Blake Corum threat persistent. Volume king but efficiency slipped late '25.",factors:["Volume","TD Machine"],adp:47.2,weekly:[16,19,14,17,22,0,15,18,14,16,19,15,17,20,14,17,15,19]},
  {name:"DK Metcalf",pos:"WR",team:"PIT",rank:32,posRk:13,tier:4,bye:9,score:75,trend:+1,own:82,note:"Year 2 in Pittsburgh. Rodgers expected, Pickens gone — alpha role settled.",factors:["Deep Threat","Red Zone"],adp:49.5,weekly:[18,22,15,17,0,19,21,16,22,24,17,15,20,18,16,19,21,18]},
  {name:"DeVonta Smith",pos:"WR",team:"PHI",rank:33,posRk:14,tier:4,bye:9,score:73,trend:0,own:80,note:"WR2 behind AJ Brown but the target tree is tight enough to matter.",factors:["WR2","PPR+"],adp:52.1,weekly:[14,18,12,0,16,19,14,17,15,13,16,14,18,15,17,14,16,15]},
  {name:"Jaxon Smith-Njigba",pos:"WR",team:"SEA",rank:34,posRk:15,tier:4,bye:8,score:74,trend:+5,own:81,note:"Broke out as SEA WR1 late '25. Metcalf gone, Lockett aging out — his show now.",factors:["Alpha WR","Breakout"],adp:54.8,weekly:[14,22,17,19,0,15,21,24,16,20,14,19,17,22,15,18,16,20]},
  {name:"Sam LaPorta",pos:"TE",team:"DET",rank:35,posRk:3,tier:2,bye:8,score:70,trend:-1,own:78,note:"Quiet '25 but target share trending back up with Williams gone.",factors:["Floor"],adp:58.4,weekly:[11,14,9,12,16,10,0,13,11,14,10,12,15,11,13,10,12,11]},
  {name:"Patrick Mahomes",pos:"QB",team:"KC",rank:36,posRk:5,tier:2,bye:10,score:82,trend:0,own:80,note:"Worthy Year 2 + Rice back. Down year in '25 priced him into value territory.",factors:["SF+","Elite OL"],adp:61.7,weekly:[21,24,19,22,26,0,18,23,21,20,24,19,22,25,18,23,20,22]}
];

const SOURCES = {
  "FantasyPros":[
    {name:"Ja'Marr Chase",rank:1},{name:"Bijan Robinson",rank:2},{name:"Jahmyr Gibbs",rank:3},
    {name:"Saquon Barkley",rank:5},{name:"Justin Jefferson",rank:4},{name:"CeeDee Lamb",rank:7},
    {name:"Malik Nabers",rank:6},{name:"Brian Thomas Jr.",rank:9},{name:"Puka Nacua",rank:8},
    {name:"Amon-Ra St. Brown",rank:11},{name:"Christian McCaffrey",rank:14},{name:"Drake London",rank:10},
    {name:"Ashton Jeanty",rank:12},{name:"Derrick Henry",rank:13},{name:"Josh Allen",rank:18},
    {name:"Lamar Jackson",rank:20},{name:"Brock Bowers",rank:19},{name:"Jayden Daniels",rank:22}
  ],
  "ESPN":[
    {name:"Ja'Marr Chase",rank:1},{name:"Justin Jefferson",rank:3},{name:"Bijan Robinson",rank:2},
    {name:"Saquon Barkley",rank:4},{name:"Jahmyr Gibbs",rank:5},{name:"CeeDee Lamb",rank:6},
    {name:"Malik Nabers",rank:8},{name:"Puka Nacua",rank:7},{name:"Brian Thomas Jr.",rank:9},
    {name:"Amon-Ra St. Brown",rank:10},{name:"Drake London",rank:11},{name:"Christian McCaffrey",rank:13}
  ],
  "The Athletic":[
    {name:"Ja'Marr Chase",rank:1},{name:"Bijan Robinson",rank:2},{name:"Jahmyr Gibbs",rank:4},
    {name:"Justin Jefferson",rank:3},{name:"Saquon Barkley",rank:5},{name:"Brian Thomas Jr.",rank:6},
    {name:"Malik Nabers",rank:8},{name:"CeeDee Lamb",rank:7},{name:"Puka Nacua",rank:10}
  ],
  "PFF":[
    {name:"Ja'Marr Chase",rank:1},{name:"Jahmyr Gibbs",rank:2},{name:"Bijan Robinson",rank:3},
    {name:"Justin Jefferson",rank:5},{name:"Saquon Barkley",rank:4},{name:"Brian Thomas Jr.",rank:6}
  ]
};

const SRC_COLORS = {
  "FantasyPros":"#1a5fd2", "ESPN":"#d2391a", "The Athletic":"#14120d", "PFF":"#b8681f", "Yahoo":"#6b3e8c", "Sleeper":"#3a8dde"
};

const NEWS_ITEMS = [
  {time:"22m",tag:"br",cat:"BREAKING",text:"Ashton Jeanty named Raiders RB1 out of OTAs; Zamir White to backup",src:"Adam Schefter"},
  {time:"1h",tag:"upd",cat:"ADP",text:"Travis Hunter ADP rising — now inside top-50 on Underdog after JAX snap projection leak",src:"PressBox"},
  {time:"3h",tag:"inj",cat:"INJURY",text:"Christian McCaffrey cleared for full participation; no limitations in 49ers camp",src:"Niners Wire"},
  {time:"5h",tag:"upd",cat:"BEAT",text:"Penix, London working overtime — ATL beat expects a 160+ target season for London",src:"The Athletic"},
  {time:"8h",tag:"upd",cat:"ROOKIE",text:"Omarion Hampton taking every first-team rep in LAC minicamp",src:"PressBox"},
  {time:"12h",tag:"upd",cat:"DYNASTY",text:"Rookie draft tiers updated: Jeanty, Hunter, Hampton in Tier 1",src:"PressBox"}
];

const DEF_DATA = [
  {team:"DEN",name:"Denver Broncos",rank:1,tier:1,score:8.9,oppRk:28,sos:"Easy",note:"Surtain + elite pass rush. Back-to-back #1 fantasy DEF."},
  {team:"PHI",name:"Philadelphia Eagles",rank:2,tier:1,score:8.5,oppRk:14,sos:"Hard",note:"Super Bowl champ DEF returns largely intact. Pass rush elite."},
  {team:"MIN",name:"Minnesota Vikings",rank:3,tier:1,score:8.3,oppRk:24,sos:"Avg",note:"Flores blitz scheme. Turnover machine."},
  {team:"PIT",name:"Pittsburgh Steelers",rank:4,tier:1,score:8.1,oppRk:20,sos:"Avg",note:"TJ Watt anchors. Rodgers offense = more DEF snaps but more leads."},
  {team:"BUF",name:"Buffalo Bills",rank:5,tier:1,score:7.9,oppRk:22,sos:"Easy",note:"#1 turnover rate 2025. Allen keeps them ahead."},
  {team:"BAL",name:"Baltimore Ravens",rank:6,tier:2,score:7.5,oppRk:12,sos:"Hard",note:"Lamar run game = TOP dominance. Sack rate top-5."},
  {team:"HOU",name:"Houston Texans",rank:7,tier:2,score:7.2,oppRk:18,sos:"Avg",note:"Will Anderson breakout continues. Easy early schedule."}
];

const K_DATA = [
  {name:"Brandon Aubrey",team:"DAL",rank:1,tier:1,score:24.4,fg:94.1,lg:88.9,note:"Best big leg in NFL. DAL dome + volume."},
  {name:"Chris Boswell",team:"PIT",rank:2,tier:1,score:23.0,fg:92.5,lg:83.3,note:"Three-season elite stretch. Points-per-game leader '25."},
  {name:"Ka'imi Fairbairn",team:"HOU",rank:3,tier:1,score:22.4,fg:91.2,lg:85.7,note:"Dome kicker with 50+ range. Stroud drives = red zone stalls."},
  {name:"Jake Elliott",team:"PHI",rank:4,tier:1,score:21.8,fg:90.0,lg:80.0,note:"Eagles scoring volume always translates. SB MVP-adjacent."},
  {name:"Cameron Dicker",team:"LAC",rank:5,tier:2,score:20.5,fg:91.4,lg:80.0,note:"Harbaugh field-goal philosophy = opportunity."}
];

const DRAFT_STRATEGY = {
  1:{positions:["RB","WR"],note:"Elite tier-1 only — Chase, Bijan, Gibbs, Saquon.",primary:"rb"},
  2:{positions:["WR","RB"],note:"WR1 value window — Jefferson, Lamb, Nabers falling.",primary:"wr"},
  3:{positions:["RB","WR"],note:"Last elite RB2. WR1-tier falloffs to grab.",primary:"wr"},
  4:{positions:["WR","RB"],note:"McCaffrey ADP discount; London alpha role.",primary:"wr"},
  5:{positions:["WR","QB"],note:"WR depth target. Allen/Lamar if elite QB need.",primary:"wr"},
  6:{positions:["QB","WR"],note:"Jayden Daniels floor + ceiling. WR2 depth.",primary:"qb"},
  7:{positions:["TE","WR"],note:"Bowers/McBride tier. Last ascending WR2s.",primary:"te"},
  8:{positions:["RB","WR"],note:"Jeanty if alive, Achane, JSN — lottery with floor.",primary:"rb"},
  9:{positions:["RB","WR"],note:"Hampton, Travis Hunter — rookie upside plays.",primary:"rb"},
  10:{positions:["WR","RB"],note:"Handcuffs + deep WR3 depth.",primary:"wr"},
  11:{positions:["QB","TE"],note:"QB2 / TE2 window. Stack your QB's pass-catcher.",primary:"qb"},
  12:{positions:["RB","WR"],note:"Upside only. Lottery-ticket rookies + handcuffs.",primary:"rb"},
  13:{positions:["DEF","K"],note:"DEF streaming prep. Top-tier kickers available.",primary:"def"},
  14:{positions:["DEF","K"],note:"Stream DEF/K. Week 1 matchup priority.",primary:"k"},
  15:{positions:["RB","WR","QB"],note:"IR stashes + final dart throws.",primary:"wr"}
};

const WEEKLY_NOTES = [
  {week:0,label:"Main League · 12-team PPR · Predraft",body:"DRAFT STRATEGY: Robin Hood build. Lock elite WR1 + RB1 in rounds 1-2, then fade RB until round 5. Jeanty + Bucky in rounds 8-10 is the sweet spot.\n\nAVOID: Derrick Henry (age cliff), Tyreek (YAC cliff), any rookie QB not named Daniels."},
  {week:0,label:"Dynasty Startup · SF",body:"Rookie heavy. Hunter, Jeanty, Hampton are the triumvirate. Target Penix/Daniels for QB2. Lock up Bijan/Gibbs/BTJ in first 3 rounds, take the age risk on rounds 4-6."},
  {week:0,label:"Best Ball · Underdog",body:"Stack correlations: Stroud-Collins, Penix-London, Daniels-McLaurin. Fade Mahomes-Worthy until 8th round. Jayden Reed at ADP 120 is the steal of July."}
];

const TRADE_VAL = {
  "Ja'Marr Chase":100, "Bijan Robinson":99, "Jahmyr Gibbs":97, "Saquon Barkley":95, "Justin Jefferson":96,
  "CeeDee Lamb":93, "Malik Nabers":92, "Brian Thomas Jr.":90, "Puka Nacua":89, "Amon-Ra St. Brown":88,
  "Christian McCaffrey":75, "Drake London":86, "Ashton Jeanty":87, "Derrick Henry":72, "Josh Allen":90,
  "Lamar Jackson":89, "Jayden Daniels":88, "Garrett Wilson":82, "Tyreek Hill":74, "Nico Collins":84,
  "Brock Bowers":86, "De'Von Achane":80, "Omarion Hampton":78, "Jonathan Taylor":73, "Bucky Irving":76,
  "Kenneth Walker III":68, "Jalen Hurts":83, "Trey McBride":80, "Travis Hunter":79, "Breece Hall":68,
  "Kyren Williams":65, "DK Metcalf":74, "DeVonta Smith":70, "Jaxon Smith-Njigba":75, "Sam LaPorta":68,
  "Patrick Mahomes":76
};

const WAIVER_TARGETS = [
  {name:"Jayden Reed",pos:"WR",team:"GB",own:48,trend:+32,note:"Love's slot target share up 8% YoY. ADP 120 → rising fast."},
  {name:"Tyjae Spears",pos:"RB",team:"TEN",own:41,trend:+24,note:"Pollard age-30, backfield in flux. Handcuff with standalone value."},
  {name:"Jordan Addison",pos:"WR",team:"MIN",own:54,trend:+18,note:"Jefferson's running mate. McCarthy Year 2 lifts the ceiling."},
  {name:"Tucker Kraft",pos:"TE",team:"GB",own:38,trend:+22,note:"Top-5 TE finish in second half of '25. ADP 110 steal."},
  {name:"Rome Odunze",pos:"WR",team:"CHI",own:51,trend:+14,note:"Caleb Year 2 breakout candidate. Target share trajectory is elite."}
];

Object.assign(window, { SEED_PLAYERS, SOURCES, SRC_COLORS, NEWS_ITEMS, DEF_DATA, K_DATA, DRAFT_STRATEGY, WEEKLY_NOTES, TRADE_VAL, WAIVER_TARGETS });
