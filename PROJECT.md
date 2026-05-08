# 현장 공수관리 시스템 - 프로젝트 정의서

> 이 문서를 AI에게 먼저 전달하면 프로젝트 구조를 즉시 파악할 수 있습니다.

---

## 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **CSS**: Tailwind CSS 4
- **DB**: SQLite (better-sqlite3) → `data/scheduler.db`
- **Auth**: NextAuth v5 (beta) / Credentials Provider / JWT
- **관리자 인증코드**: `admin2026` (app/api/register/route.ts에서 변경)

---

## DB 스키마 (lib/db.ts)

```
users          : id, username(UNIQUE), password(bcrypt), role(admin|member), display_name, created_at
companies      : id, name, color, created_at
projects       : id, company_id(FK→companies), name, start_date?, end_date?, is_active(0|1), created_at
daily_assignments : id, user_id(FK→users), project_id(FK→projects), date, man_day(REAL, 기본1.0), note?, created_at
                    UNIQUE(user_id, project_id, date)
```

인덱스: `daily_assignments(date)`, `(user_id,date)`, `(project_id,date)`

시드: admin / admin123 / role=admin

---

## 파일 구조 & 역할

### 루트 설정
| 파일 | 역할 |
|------|------|
| `auth.ts` | NextAuth v5 설정. Credentials Provider, JWT 콜백(session에 id/role/username/displayName 주입). trustHost:true |
| `proxy.ts` | Next.js 16 미들웨어(export default function proxy). /admin, /calendar 인증체크 |
| `next.config.ts` | serverExternalPackages: better-sqlite3, allowedDevOrigins |
| `.env.local` | AUTH_SECRET (Render에도 환경변수로 등록 필요) |
| `types/next-auth.d.ts` | Session/JWT 타입 확장 (id:number, role, username, displayName) |

### lib/
| 파일 | 역할 |
|------|------|
| `lib/db.ts` | getDb() 싱글턴. 최초 호출 시 테이블 생성 + admin 시드 |
| `lib/colors.ts` | 업체 색상 팔레트 12색. getNextColor(usedColors) |

### components/
| 파일 | 역할 |
|------|------|
| `components/Sidebar.tsx` | 관리자 사이드바. 메뉴4개(달력/공사관리/인원관리/월간집계) + 로그아웃. 모바일 햄버거 대응 |

### 페이지 (app/)
| 경로 | 파일 | 역할 | 권한 |
|------|------|------|------|
| `/` | `app/page.tsx` | 역할별 리다이렉트 (admin→/admin/calendar, member→/calendar) | 로그인필수 |
| `/login` | `app/login/page.tsx` | 로그인 폼. 하단 회원가입 링크 | 공개 |
| `/register` | `app/register/page.tsx` | 회원가입 (이름+비밀번호+관리자체크+인증코드) | 공개 |
| `/admin/*` | `app/admin/layout.tsx` | 관리자 레이아웃. Sidebar 포함 | admin |
| `/admin/calendar` | `app/admin/calendar/page.tsx` | **핵심** 월달력. 셀에 [업체](공사)+인원. 날짜클릭→상세패널(배치 추가/수정/삭제) | admin |
| `/admin/companies` | `app/admin/companies/page.tsx` | 업체 목록 카드. 업체등록 모달. 진행중공사수/오늘투입인원 | admin |
| `/admin/companies/[companyId]` | `app/admin/companies/[companyId]/page.tsx` | 해당 업체의 공사 목록. CRUD + 활성토글 | admin |
| `/admin/members` | `app/admin/members/page.tsx` | 인원 목록. CRUD. 이번달 총공수 표시 | admin |
| `/admin/summary` | `app/admin/summary/page.tsx` | 월간집계. 개인별 출근표 + 현장별 공수(업체별 탭 필터) | admin |
| `/calendar` | `app/calendar/page.tsx` | 일반회원 본인 달력. 읽기전용 | member |

### API Routes (app/api/)
| 엔드포인트 | 메서드 | 기능 |
|------------|--------|------|
| `/api/auth/[...nextauth]` | GET,POST | NextAuth 핸들러 |
| `/api/register` | POST | 회원가입. body: {name, password, isAdmin, adminCode} |
| `/api/companies` | GET | 업체 목록 + project_count + today_workers |
| `/api/companies` | POST | 업체 등록. body: {name}. 색상 자동할당 |
| `/api/companies/[id]` | GET,PUT,DELETE | 업체 CRUD |
| `/api/companies/[id]/projects` | GET,POST | 업체별 공사 목록/등록 |
| `/api/projects` | GET | 전체 활성 공사 (드롭다운용) |
| `/api/projects/[id]` | PUT,DELETE | 공사 수정/삭제 |
| `/api/members` | GET,POST | 인원 목록(+month_total)/등록 |
| `/api/members/[id]` | PUT,DELETE | 인원 수정/삭제 |
| `/api/calendar` | GET | 월 배치 전체. ?year=&month= |
| `/api/assignments` | POST | 배치 추가(다중). INSERT OR REPLACE |
| `/api/assignments/[id]` | PUT,DELETE | 배치 수정/삭제 |
| `/api/summary` | GET | 월간 집계. personData + projectData |
| `/api/my-calendar` | GET | 회원 본인 달력 |

---

## 핵심 데이터 흐름

```
업체(companies) → 공사(projects) → 일별배치(daily_assignments) ← 인원(users)
```

- 1 업체 : N 공사
- 1 공사 : N 일별배치
- 1 인원 : N 일별배치 (하루에 여러 공사 가능)
- 공수(man_day): 기본 1.0, 반일 0.5

## 달력 셀 표시 형식

```
[업체명] 공사명
인원1, 인원2, ...
```

업체별 고유색상(company.color)으로 배경 구분

---

## 배포

- **로컬**: `npm run dev` → http://localhost:2026
- **Render**: PORT 환경변수 자동 사용. AUTH_SECRET 환경변수 필수
- **주의**: Render 무료 플랜은 서버 재시작 시 SQLite DB 초기화됨

---

## 미구현 / 확장 예정

- [ ] 엑셀 내보내기 (SheetJS)
- [ ] 배치 복사 (특정 날짜 → 다른 날짜)
- [ ] 공휴일 자동 표시
- [ ] 인쇄 최적화 (월간집계)
- [ ] 배치 드래그앤드롭
