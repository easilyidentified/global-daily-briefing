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
  BRIEFING_TO         수신자. 콤마로 구분. 예: "a@x.com, b@y.com"        (필수)
  BRIEFING_FROM_NAME  발신자 표시 이름. 기본 "Daily News Briefing"       (선택)
  BRIEFING_COUNTRY    국가코드. 기본 KR                                  (선택)

의존성 없음: 표준 라이브러리(smtplib, email)만 사용.
"""
import json, os, sys, html, smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr

ACCENT = "#a50034"
INK    = "#111827"
SUB    = "#4b5563"
LINE   = "#e5e7eb"
BG     = "#f4f5f7"
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


def render_html(country_code, data):
    c = data["COUNTRIES"][country_code]
    ld, groups = _today_issues(c)
    cname  = c.get("countryName", country_code)
    period = c.get("period", "")

    # 매핑(요약): 3열 표 대신 세로 스택
    map_rows = []
    for cat in ("politics", "economy", "other"):
        for n, iss in enumerate(groups[cat], 1):
            tag = f"{CATLABEL[cat]} {n}"
            map_rows.append(f'''
      <tr><td style="padding:14px 0;border-bottom:1px solid {LINE};">
        <span style="display:inline-block;background:{INK};color:#ffffff;font-size:12px;font-weight:700;padding:3px 9px;border-radius:4px;">{esc(tag)}</span>
        <div style="margin-top:9px;font-size:15px;line-height:1.55;color:{SUB};"><span style="color:{ACCENT};font-weight:700;">Why</span>&nbsp; {esc(iss.get("why",""))}</div>
        <div style="margin-top:5px;font-size:15px;line-height:1.55;color:{INK};font-weight:600;"><span style="color:{ACCENT};font-weight:700;">So What</span>&nbsp; {esc(iss.get("soWhat",""))}</div>
      </td></tr>''')
    mapping = "".join(map_rows)

    def card(iss, n):
        ctx = iss.get("context", {}) or {}
        rows = []
        for label, key in (("기존", "background"), ("이슈 맥락", "issueContext"),
                           ("핵심 Q", "coreQuestion"), ("이슈", "resolution")):
            val = ctx.get(key)
            if not val:
                continue
            rows.append(f'''
        <div style="margin-bottom:9px;">
          <div style="font-size:12px;font-weight:700;color:{ACCENT};letter-spacing:0.3px;margin-bottom:2px;">{esc(label)}</div>
          <div style="font-size:15px;line-height:1.6;color:{INK};">{esc(val)}</div>
        </div>''')
        srcs = iss.get("sources", []) or []
        src_html = " · ".join(
            f'<a href="{esc(s.get("url",""))}" style="color:{SUB};text-decoration:underline;">{esc(s.get("name",""))}</a>'
            for s in srcs)
        related = iss.get("related") or {}
        rel_html = ""
        if related.get("title"):
            rel_html = f'''
        <div style="margin-top:12px;padding:10px 12px;background:#f9fafb;border-radius:6px;font-size:13px;line-height:1.5;color:{SUB};">
          <span style="font-weight:700;color:{INK};">함께 읽기</span> ·
          <a href="{esc(related.get("url",""))}" style="color:{SUB};text-decoration:underline;">{esc(related.get("title",""))}</a>
          <span style="color:#9ca3af;">({esc(related.get("source",""))}·{esc(related.get("type",""))})</span>
        </div>'''
        return f'''
      <tr><td style="padding:22px 0 4px 0;">
        <div style="font-size:16px;font-weight:700;line-height:1.45;color:{INK};margin-bottom:11px;">{n}. {esc(iss.get("title",""))}</div>
        <div style="background:#fdf2f4;border-left:4px solid {ACCENT};border-radius:5px;padding:12px 14px;font-size:15px;line-height:1.6;font-weight:700;color:{INK};margin-bottom:14px;">{esc(iss.get("summary",""))}</div>
        {"".join(rows)}
        <div style="margin-top:10px;font-size:13px;color:{SUB};">출처 · {src_html}</div>{rel_html}
      </td></tr>
      <tr><td style="border-bottom:1px solid {LINE};font-size:0;line-height:0;">&nbsp;</td></tr>'''

    sections = []
    for cat, title in (("politics", "■ 정치"), ("economy", "■ 경제"), ("other", "■ 기타 이슈")):
        if not groups[cat]:
            continue
        cards = "".join(card(iss, n) for n, iss in enumerate(groups[cat], 1))
        sections.append(f'''
      <tr><td style="padding:34px 0 0 0;"><div style="font-size:17px;font-weight:800;color:{INK};border-bottom:2px solid {INK};padding-bottom:7px;letter-spacing:0.5px;">{esc(title)}</div></td></tr>
      {cards}''')
    body_sections = "".join(sections)
    preheader = f"{cname} 데일리 뉴스 브리핑 · {ld}"

    html_doc = f'''<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>{esc(preheader)}</title>
<style>
  body{{margin:0;padding:0;background:{BG};}}
  a{{word-break:break-all;}}
  @media only screen and (max-width:620px){{
    .container{{width:100% !important;}}
    .pad{{padding-left:18px !important;padding-right:18px !important;}}
  }}
</style></head>
<body style="margin:0;padding:0;background:{BG};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BG};">
  <tr><td align="center" style="padding:20px 10px;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <tr><td class="pad" style="padding:26px 32px 18px 32px;border-bottom:2px solid {INK};">
        <div style="font-size:22px;font-weight:800;color:{INK};letter-spacing:-0.5px;">DAILY NEWS SUMMARY BRIEFING</div>
        <div style="margin-top:7px;font-size:13px;color:{SUB};line-height:1.5;"><span style="font-weight:700;color:{INK};">{esc(cname)}</span> &nbsp;·&nbsp; 기간 {esc(period)}</div>
      </td></tr>
      <tr><td class="pad" style="padding:8px 32px 8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:24px 0 4px 0;"><div style="font-size:13px;font-weight:700;color:{INK};text-transform:uppercase;letter-spacing:0.6px;">주요 이슈 요약 (Why → So What)</div></td></tr>
          {mapping}
          {body_sections}
        </table>
      </td></tr>
      <tr><td class="pad" style="padding:22px 32px 30px 32px;background:#fafafa;border-top:1px solid {LINE};">
        <div style="font-size:12px;color:#9ca3af;line-height:1.6;">자동 생성 · {esc(ld)} 08:00 KST 브리핑 · Global Daily Briefing<br>데이터 출처: easilyidentified/global-daily-briefing</div>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>'''

    # 플레인텍스트 대체본 (스팸 점수↓, 접근성↑)
    lines = [f"DAILY NEWS SUMMARY BRIEFING — {cname} · {period}", ""]
    lines.append("[주요 이슈 요약]")
    for cat in ("politics", "economy", "other"):
        for n, iss in enumerate(groups[cat], 1):
            lines.append(f"- {CATLABEL[cat]} {n} | Why: {iss.get('why','')} | So What: {iss.get('soWhat','')}")
    for cat, title in (("politics", "■ 정치"), ("economy", "■ 경제"), ("other", "■ 기타 이슈")):
        if not groups[cat]:
            continue
        lines += ["", title]
        for n, iss in enumerate(groups[cat], 1):
            lines.append(f"{n}. {iss.get('title','')}")
            lines.append(f"   핵심 요약: {iss.get('summary','')}")
            ctx = iss.get("context", {}) or {}
            for lb, k in (("기존", "background"), ("이슈 맥락", "issueContext"), ("핵심 Q", "coreQuestion"), ("이슈", "resolution")):
                if ctx.get(k):
                    lines.append(f"   [{lb}] {ctx[k]}")
            srcs = ", ".join(f"{s.get('name','')}({s.get('url','')})" for s in (iss.get("sources") or []))
            if srcs:
                lines.append(f"   출처: {srcs}")
    text_doc = "\n".join(lines)

    subject = f"[뉴스 브리핑] {ld} {cname} 주요 이슈 브리핑"
    return subject, html_doc, text_doc


def send_via_gmail(user, app_password, from_name, recipients, subject, html_doc, text_doc):
    # 앱 비밀번호는 표시상 공백이 들어가므로 제거
    app_password = app_password.replace(" ", "")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = str(Header(subject, "utf-8"))
    msg["From"] = formataddr((str(Header(from_name, "utf-8")), user))
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(text_doc, "plain", "utf-8"))
    msg.attach(MIMEText(html_doc, "html", "utf-8"))   # 마지막 part가 우선 표시(HTML)
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=30) as s:
            s.login(user, app_password)
            s.sendmail(user, recipients, msg.as_string())
        print(f"[send] 발송 완료 → {len(recipients)}명: {', '.join(recipients)}")
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

    with open(os.path.join(os.path.dirname(__file__), "..", "data", "issues.json"), encoding="utf-8") as f:
        data = json.load(f)
    if country not in data.get("COUNTRIES", {}):
        print(f"[data] 국가코드 {country} 없음. 가능: {list(data['COUNTRIES'])}", file=sys.stderr)
        return 2

    ld = data["COUNTRIES"][country]["latestDate"]
    expect = os.environ.get("EXPECT_DATE", "").strip()
    if expect and ld != expect:
        # 오늘 수집이 실패/미반영이면 어제치를 보내지 않고 건너뛴다(오발송 방지).
        print(f"[skip] latestDate({ld}) != 오늘({expect}) — 수집 미반영으로 판단, 발송하지 않습니다.")
        return 0

    subject, html_doc, text_doc = render_html(country, data)
    _, groups = _today_issues(data["COUNTRIES"][country])
    n_today = sum(len(v) for v in groups.values())
    print(f"[render] {country} {ld}: 오늘 {n_today}건, 제목='{subject}', HTML {len(html_doc)}B")

    if n_today == 0:
        print("[skip] 오늘자 기사가 없어 발송하지 않습니다.")
        return 0
    if dry:
        out = os.path.join(os.path.dirname(__file__), "..", f"preview_{country}.html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(html_doc)
        print(f"[dry-run] 발송 생략, 미리보기 저장: {out}")
        return 0

    return send_via_gmail(user, app_pw, from_name, recipients, subject, html_doc, text_doc)


if __name__ == "__main__":
    sys.exit(main())
