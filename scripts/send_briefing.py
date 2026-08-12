#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
데일리 뉴스 브리핑 이메일 발송 스크립트 (Gmail SMTP).

data/issues.json에서 '오늘'(date == latestDate) 기사를 읽어
모바일 최적화 HTML 이메일을 렌더링하고 Gmail SMTP로 발송한다.
커스텀 도메인 불필요 — 본인 Gmail 계정 + 앱 비밀번호만 있으면 된다.

필요 환경변수 (GitHub Actions에서 secrets/vars로 주입):
  GMAIL_USER          발신 Gmail 주소. 예: "kimgt0530@gmail.com"        (필수)
  GMAIL_APP_PASSWORD  Gmail 앱 비밀번호 16자리(공백 무시). 2단계 인증 후 발급 (필수, secret)
  BRIEFING_TO         수신자 전원. 콤마로 구분. 예: "a@x.com, b@y.com"    (필수)
  BRIEFING_TO_VISIBLE To 헤더에 노출할 주소. 나머지는 전부 숨은 참조(BCC).
                      비워 두면 BRIEFING_TO의 맨 앞 주소 하나만 보인다.  (선택)
  BRIEFING_FROM_NAME  발신자 표시 이름. 기본 "Daily News Briefing"       (선택)
  BRIEFING_COUNTRY    국가코드. 기본 KR                                  (선택)

의존성 없음: 표준 라이브러리(smtplib, email)만 사용.
"""
import json, os, sys, html, base64, smtplib, ssl
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr

SITE_URL = "https://easilyidentified.github.io/global-daily-briefing/"
BANNER_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "email_banner.png")
BANNER_CID = "briefing-banner"
BANNER_ALT = "세계의 이슈로 온톨로지를 구축합니다 · 글로벌 데일리 브리핑"

# ── Modernist 팔레트 ─────────────────────────────────
# 출처: claude.ai Design 프로젝트 "Global-Daily-Briefing email redesign"
# (projectId fde7ba93-63e7-4499-bf08-100cd9039c37) 의 briefing-email.html
GROUND  = "#e4e1e1"   # 컨테이너 바깥 바탕
CARD    = "#f8f4f4"   # 본문 컨테이너
INK     = "#201e1d"   # 제목·강조 텍스트
BODY    = "#2d2b2b"   # 기사 요약 본문
SUB     = "#605d5d"   # 보조 텍스트·라벨
SUB2    = "#444141"   # 맥락 4행 값
LINE    = "#c9c5c5"   # 1px 얇은 선
ACCENT  = "#ec3013"   # 포인트 레드
FONT    = "'Helvetica Neue',Helvetica,Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif"

UNSUB_TO   = "kimgt0530@gmail.com"
UNSUB_SUBJ = "%EA%B5%AC%EB%8F%85%20%ED%95%B4%EC%A7%80"   # '구독 해지'

# f-string 안에서 중괄호를 이스케이프하지 않으려고 일반 문자열로 둔다.
MSO_BLOCK = """<!--[if mso]>
<style>body,table,td,div,span,a{font-family:Arial,sans-serif !important;}</style>
<![endif]-->"""

STYLE_BLOCK = """<style>
  body{margin:0;padding:0;background:#e4e1e1;}
  a{word-break:break-word;}
  @media only screen and (max-width:620px){
    .container{width:100% !important;}
    .pad{padding-left:20px !important;padding-right:20px !important;}
    .h1{font-size:28px !important;}
    .ttl{font-size:21px !important;}
    .lbl{display:block !important;width:auto !important;padding:13px 0 0 0 !important;}
    .val{display:block !important;width:auto !important;padding:3px 0 14px 0 !important;border-top:0 !important;}
    .lbl2{display:block !important;width:auto !important;padding:9px 0 0 16px !important;}
    .val2{display:block !important;width:auto !important;padding:2px 0 8px 16px !important;}
  }
  @media (prefers-color-scheme:dark){
    body,.ground{background:#2d2b2b !important;}
  }
</style>"""

CATLABEL = {"politics": "정치", "economy": "경제", "other": "기타"}
ORDER    = {"politics": 0, "economy": 1, "other": 2}


def esc(s):
    return html.escape(s or "", quote=True)


def _today_issues(country):
    ld = country["latestDate"]
    today = [i for i in country["issues"] if i.get("date") == ld]
    today.sort(key=lambda i: ORDER.get(i["category"], 9))
    groups = {"politics": [], "economy": [], "other": []}
    for i in today:
        groups.setdefault(i["category"], []).append(i)
    return ld, groups


def render_html(country_code, data, banner_src=None):
    c = data["COUNTRIES"][country_code]
    ld, groups = _today_issues(c)
    cname  = c.get("countryName", country_code)
    period = c.get("period", "")

    # 번호는 카테고리마다 1부터 다시 센다. 요약표와 카드가 같은 번호를 가리킨다.
    flat = [(cat, iss, n)
            for cat in ("politics", "economy", "other")
            for n, iss in enumerate(groups[cat], 1)]
    n_today = len(flat)

    # ── 오늘의 요약 ────────────────────────────────────
    map_rows = []
    for cat, iss, n in flat:
        map_rows.append(f'''
      <tr>
        <td width="42" valign="top" style="width:42px;padding:13px 0;border-top:1px solid {LINE};font-size:15px;font-weight:700;color:{INK};line-height:1.45;mso-line-height-rule:exactly;">{n:02d}</td>
        <td valign="top" style="padding:13px 0;border-top:1px solid {LINE};">
          <div style="font-size:17px;line-height:1.45;font-weight:700;color:{INK};mso-line-height-rule:exactly;">{esc(iss.get("title",""))}</div>
          <div style="margin-top:5px;font-size:14px;line-height:1.55;color:{SUB};">{esc(CATLABEL[cat])} &nbsp;·&nbsp; {esc(iss.get("soWhat",""))}</div>
        </td>
      </tr>''')
    mapping = "".join(map_rows)

    # ── 기사 카드 ──────────────────────────────────────
    def card(iss, n):
        ctx = iss.get("context", {}) or {}
        ctx_rows = []
        for label, key in (("기존", "background"), ("이슈 맥락", "issueContext"),
                           ("핵심 Q", "coreQuestion"), ("이슈", "resolution")):
            val = ctx.get(key)
            if not val:
                continue
            ctx_rows.append(f'''
      <tr>
        <td class="lbl2" width="104" valign="top" style="width:104px;padding:6px 10px 6px 28px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:{SUB};line-height:1.5;mso-line-height-rule:exactly;">{esc(label)}</td>
        <td class="val2" valign="top" style="padding:6px 0;font-size:14px;line-height:1.6;color:{SUB2};mso-line-height-rule:exactly;">{esc(val)}</td>
      </tr>''')

        srcs = iss.get("sources", []) or []
        src_html = " · ".join(
            f'<a href="{esc(s.get("url",""))}" style="color:{SUB};text-decoration:underline;">{esc(s.get("name",""))}</a>'
            for s in srcs)
        foot = f"출처 · {src_html}" if src_html else ""

        related = iss.get("related") or {}
        if related.get("title"):
            rel = (f'함께 읽기 · {esc(related.get("type",""))} · '
                   f'<a href="{esc(related.get("url",""))}" style="color:{SUB};text-decoration:underline;">'
                   f'{esc(related.get("title",""))}</a> ({esc(related.get("source",""))})')
            foot = f"{foot}<br>\n        {rel}" if foot else rel

        foot_row = ""
        if foot:
            foot_row = f'''
      <tr><td colspan="2" style="padding:13px 0 0 0;border-top:1px solid {LINE};font-size:13px;line-height:1.7;color:{SUB};">
        {foot}
      </td></tr>'''

        return f'''
  <tr><td class="pad" style="padding:26px 32px 0 32px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.12em;color:{ACCENT};">{n:02d}</div>
    <div class="ttl" style="margin-top:9px;font-size:23px;line-height:1.34;font-weight:700;color:{INK};letter-spacing:-0.4px;mso-line-height-rule:exactly;">{esc(iss.get("title",""))}</div>
    <div style="margin-top:12px;font-size:17px;line-height:1.68;color:{BODY};mso-line-height-rule:exactly;">{esc(iss.get("summary",""))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
      <tr>
        <td class="lbl" width="104" valign="top" style="width:104px;padding:14px 12px 14px 0;border-top:1px solid {LINE};font-size:12px;font-weight:700;letter-spacing:0.12em;color:{SUB};line-height:1.5;mso-line-height-rule:exactly;">ISSUE</td>
        <td class="val" valign="top" style="padding:14px 0;border-top:1px solid {LINE};font-size:17px;line-height:1.65;font-weight:400;color:{INK};mso-line-height-rule:exactly;">{esc(iss.get("why",""))}</td>
      </tr>{"".join(ctx_rows)}
      <tr>
        <td class="lbl" width="104" valign="top" style="width:104px;padding:14px 12px 14px 0;border-top:1px solid {LINE};font-size:12px;font-weight:700;letter-spacing:0.12em;color:{ACCENT};line-height:1.5;mso-line-height-rule:exactly;">IMPACT</td>
        <td class="val" valign="top" style="padding:14px 0;border-top:1px solid {LINE};font-size:17px;line-height:1.65;font-weight:400;color:{INK};mso-line-height-rule:exactly;">{esc(iss.get("soWhat",""))}</td>
      </tr>{foot_row}
    </table>
  </td></tr>'''

    # ── 카테고리 섹션 ──────────────────────────────────
    hr1 = f'''
  <tr><td class="pad" style="padding:30px 32px 0 32px;"><div style="height:1px;background:{INK};font-size:0;line-height:0;">&nbsp;</div></td></tr>'''

    sections = []
    first = True
    for cat, label in (("politics", "정치"), ("economy", "경제"), ("other", "기타 이슈")):
        if not groups[cat]:
            continue
        sections.append(f'''
  <tr><td class="pad" style="padding:{38 if first else 44}px 32px 0 32px;">
    <div style="height:2px;background:{INK};font-size:0;line-height:0;">&nbsp;</div>
    <div style="padding-top:10px;font-size:14px;font-weight:700;letter-spacing:0.16em;color:{ACCENT};">{esc(label)} &nbsp;·&nbsp; {len(groups[cat])}건</div>
  </td></tr>''')
        first = False
        cards = [card(iss, n) for n, iss in enumerate(groups[cat], 1)]
        sections.append(hr1.join(cards))
    body_sections = "".join(sections)

    # ── 배너 ───────────────────────────────────────────
    banner = ""
    if banner_src:
        banner = f'''
  <tr><td class="pad" style="padding:30px 32px 0 32px;">
    <a href="{SITE_URL}" style="display:block;text-decoration:none;border:0;">
      <img src="{banner_src}" width="536" alt="{esc(BANNER_ALT)}" style="width:100%;max-width:536px;height:auto;display:block;border:0;outline:none;text-decoration:none;">
    </a>
  </td></tr>'''

    head3 = ", ".join(esc(i.get("title", "")) for _, i, _n in flat[:3])
    preheader = f"{esc(cname)} 오늘의 {n_today}건 — {head3}"

    html_doc = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{esc(cname)} 주요 이슈 브리핑 · {esc(ld)}</title>
{MSO_BLOCK}
{STYLE_BLOCK}
</head>
<body style="margin:0;padding:0;background:{GROUND};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>

<table role="presentation" class="ground" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{GROUND};">
<tr><td align="center" style="padding:24px 8px;">

<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:{CARD};font-family:{FONT};">

  <tr><td height="4" bgcolor="{ACCENT}" style="height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

  <tr><td class="pad" style="padding:28px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="left" style="font-size:12px;font-weight:700;letter-spacing:0.18em;color:{INK};">GLOBAL DAILY BRIEFING</td>
      <td align="right" style="font-size:12px;font-weight:700;letter-spacing:0.06em;color:{SUB};">{esc(ld)}</td>
    </tr></table>
    <div class="h1" style="margin-top:18px;font-size:33px;line-height:1.16;font-weight:700;color:{INK};letter-spacing:-1px;mso-line-height-rule:exactly;">{esc(cname)}<br>주요 이슈 브리핑</div>
    <div style="margin-top:14px;font-size:14px;line-height:1.55;color:{SUB};">{esc(period)} &nbsp;·&nbsp; 오늘 <span style="font-weight:700;color:{INK};">{n_today}건</span></div>
    <div style="height:2px;background:{INK};margin-top:22px;font-size:0;line-height:0;">&nbsp;</div>
    <div style="padding-top:10px;font-size:14px;font-weight:700;letter-spacing:0.16em;color:{INK};">오늘의 요약</div>
  </td></tr>

  <tr><td class="pad" style="padding:8px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{mapping}
    </table>
  </td></tr>
{banner}{body_sections}

  <tr><td class="pad" style="padding:44px 32px 0 32px;">
    <div style="height:2px;background:{INK};font-size:0;line-height:0;">&nbsp;</div>
    <div style="padding-top:22px;font-size:22px;line-height:1.35;font-weight:700;color:{INK};letter-spacing:-0.4px;mso-line-height-rule:exactly;">세계의 이슈로 온톨로지를 구축합니다</div>
    <div style="margin-top:10px;font-size:15px;line-height:1.6;color:{SUB};">세계가 어떤 이슈로 연결되고 있을까요?<br>시각적으로 확인해보세요</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
      <td bgcolor="{ACCENT}" style="padding:13px 18px;">
        <a href="{SITE_URL}" style="display:block;font-family:{FONT};font-size:15px;font-weight:700;color:{CARD};text-decoration:none;">사이트 접속 ↗</a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td class="pad" style="padding:34px 32px 30px 32px;">
    <div style="height:1px;background:{LINE};font-size:0;line-height:0;">&nbsp;</div>
    <div style="padding-top:16px;font-size:12px;line-height:1.7;color:{SUB};">
      이 메일은 구독 신청한 주소로 발송됩니다. <a href="mailto:{UNSUB_TO}?subject={UNSUB_SUBJ}" style="color:{SUB};text-decoration:underline;">수신 거부</a>
    </div>
  </td></tr>
</table>

</td></tr>
</table>
</body>
</html>'''

    # ── 플레인텍스트 대체본 (스팸 점수↓, 접근성↑) ──────
    lines = [f"GLOBAL DAILY BRIEFING — {cname} 주요 이슈 브리핑",
             f"{period} · 오늘 {n_today}건", "", "[오늘의 요약]"]
    for cat, iss, n in flat:
        lines.append(f"{n:02d}. {iss.get('title','')}")
        lines.append(f"    {CATLABEL[cat]} · {iss.get('soWhat','')}")
    for cat, label in (("politics", "정치"), ("economy", "경제"), ("other", "기타 이슈")):
        if not groups[cat]:
            continue
        lines += ["", f"[{label} · {len(groups[cat])}건]"]
        for n, iss in enumerate(groups[cat], 1):
            lines.append("")
            lines.append(f"{n:02d}. {iss.get('title','')}")
            lines.append(f"    {iss.get('summary','')}")
            lines.append(f"    ISSUE  {iss.get('why','')}")
            ctx = iss.get("context", {}) or {}
            for lb, k in (("기존", "background"), ("이슈 맥락", "issueContext"),
                          ("핵심 Q", "coreQuestion"), ("이슈", "resolution")):
                if ctx.get(k):
                    lines.append(f"      [{lb}] {ctx[k]}")
            lines.append(f"    IMPACT {iss.get('soWhat','')}")
            srcs = ", ".join(f"{s.get('name','')}({s.get('url','')})" for s in (iss.get("sources") or []))
            if srcs:
                lines.append(f"    출처 · {srcs}")
            rel = iss.get("related") or {}
            if rel.get("title"):
                lines.append(f"    함께 읽기 · {rel.get('type','')} · {rel.get('title','')} ({rel.get('source','')}) {rel.get('url','')}")
    lines += ["", f"세계의 이슈로 온톨로지를 구축합니다 · {SITE_URL}"]
    text_doc = "\n".join(lines)

    subject = f"[뉴스 브리핑] {ld} {cname} 주요 이슈 브리핑"
    return subject, html_doc, text_doc


def send_via_gmail(user, app_password, from_name, recipients, subject, html_doc, text_doc,
                   inline_image=None, visible=None):
    """recipients 전원에게 배달하되, To 헤더에는 visible만 적는다.

    SMTP는 '실제 배달 목록'(sendmail의 두 번째 인자, 봉투)과 '메일에 적힌 수신자'(To 헤더)를
    따로 다룬다. 헤더에서 빠진 주소는 받는 사람 눈에 보이지 않으므로 그대로 숨은 참조가 된다.
    Bcc 헤더는 절대 넣지 않는다 — 넣으면 숨기려던 주소가 그대로 노출된다.
    """
    # 앱 비밀번호는 표시상 공백이 들어가므로 제거
    app_password = app_password.replace(" ", "")
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text_doc, "plain", "utf-8"))
    alt.attach(MIMEText(html_doc, "html", "utf-8"))   # 마지막 part가 우선 표시(HTML)

    if inline_image:
        path, cid = inline_image
        msg = MIMEMultipart("related")
        msg.attach(alt)
        with open(path, "rb") as f:
            img = MIMEImage(f.read())
        img.add_header("Content-ID", f"<{cid}>")
        img.add_header("Content-Disposition", "inline", filename="banner.png")
        msg.attach(img)
    else:
        msg = alt

    visible = visible or recipients
    msg["Subject"] = str(Header(subject, "utf-8"))
    msg["From"] = formataddr((str(Header(from_name, "utf-8")), user))
    msg["To"] = ", ".join(visible)
    hidden = len([r for r in recipients if r not in visible])
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=30) as s:
            s.login(user, app_password)
            s.sendmail(user, recipients, msg.as_string())
        # 공개 리포의 Actions 로그는 누구나 볼 수 있다. 주소는 찍지 않고 숫자만 남긴다.
        print(f"[send] 발송 완료 → 배달 {len(recipients)}명 · To 헤더 {len(visible)}개 · 숨은참조 {hidden}명")
        return 0
    except smtplib.SMTPAuthenticationError as e:
        print(f"[send] 인증 실패(앱 비밀번호/2단계 인증 확인): {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[send] 발송 실패: {e}", file=sys.stderr)
        return 1


def main():
    user      = os.environ.get("GMAIL_USER", "").strip()
    app_pw    = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
    to_raw    = os.environ.get("BRIEFING_TO", "").strip()
    from_name = os.environ.get("BRIEFING_FROM_NAME", "Daily News Briefing").strip() or "Daily News Briefing"
    country   = os.environ.get("BRIEFING_COUNTRY", "KR").strip() or "KR"
    dry       = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes")

    missing = [k for k, v in (("GMAIL_USER", user), ("GMAIL_APP_PASSWORD", app_pw), ("BRIEFING_TO", to_raw)) if not v and not dry]
    if missing:
        print(f"[config] 필수 환경변수 누락: {', '.join(missing)}", file=sys.stderr)
        return 2

    recipients = [x.strip() for x in to_raw.split(",") if x.strip()]

    # To 헤더에 이름이 뜨는 주소. 나머지 BRIEFING_TO 주소는 전부 숨은 참조로 나간다.
    # BRIEFING_TO_VISIBLE을 두지 않으면 BRIEFING_TO의 맨 앞 주소 하나만 보인다.
    # 배달 대상은 BRIEFING_TO가 전부다. VISIBLE은 '보이기'만 바꾸지 배달을 늘리지 않는다
    # (대표 주소를 표시용으로만 쓰는 경우가 있어, 여기에 배달을 붙이면 오배송이 된다).
    vis_raw = os.environ.get("BRIEFING_TO_VISIBLE", "").strip()
    visible = [x.strip() for x in vis_raw.split(",") if x.strip()] or recipients[:1]

    with open(os.path.join(os.path.dirname(__file__), "..", "data", "issues.json"), encoding="utf-8") as f:
        data = json.load(f)
    if country not in data.get("COUNTRIES", {}):
        print(f"[data] 국가코드 {country} 없음. 가능: {list(data['COUNTRIES'])}", file=sys.stderr)
        return 2

    ld = data["COUNTRIES"][country]["latestDate"]
    expect = os.environ.get("EXPECT_DATE", "").strip()
    # 수동 실행에서만 켜는 테스트 스위치. 스케줄 실행에서는 항상 꺼져 있다.
    force = os.environ.get("FORCE_SEND", "").strip().lower() in ("1", "true", "yes")
    if force and expect and ld != expect:
        print(f"[force] latestDate({ld}) != 오늘({expect}) 이지만 FORCE_SEND로 검사를 건너뜁니다.")
        expect = ""
    if expect and ld != expect:
        # 오늘 수집이 실패/미반영이면 어제치를 보내지 않고 건너뛴다(오발송 방지).
        print(f"[skip] latestDate({ld}) != 오늘({expect}) — 수집 미반영으로 판단, 발송하지 않습니다.")
        return 0

    has_banner = os.path.exists(BANNER_PATH)
    if not has_banner:
        print(f"[banner] {BANNER_PATH} 없음 — 배너 없이 발송합니다.")

    # 발송 시엔 인라인(cid:), 미리보기 시엔 data URI로 배너 삽입
    if dry and has_banner:
        with open(BANNER_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        banner_src = f"data:image/png;base64,{b64}"
    else:
        banner_src = f"cid:{BANNER_CID}" if has_banner else None

    subject, html_doc, text_doc = render_html(country, data, banner_src=banner_src)
    _, groups = _today_issues(data["COUNTRIES"][country])
    n_today = sum(len(v) for v in groups.values())
    print(f"[render] {country} {ld}: 오늘 {n_today}건, 배너={'있음' if has_banner else '없음'}, 제목='{subject}', HTML {len(html_doc)}B")

    if n_today == 0:
        print("[skip] 오늘자 기사가 없어 발송하지 않습니다.")
        return 0
    if dry:
        out = os.path.join(os.path.dirname(__file__), "..", f"preview_{country}.html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(html_doc)
        print(f"[dry-run] 발송 생략, 미리보기 저장: {out}")
        return 0

    inline_image = (BANNER_PATH, BANNER_CID) if has_banner else None
    return send_via_gmail(user, app_pw, from_name, recipients, subject, html_doc, text_doc,
                          inline_image=inline_image, visible=visible)


if __name__ == "__main__":
    sys.exit(main())
