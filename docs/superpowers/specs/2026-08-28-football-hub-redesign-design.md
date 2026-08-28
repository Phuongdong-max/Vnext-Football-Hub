# Redesign UI/UX Vnext Football Hub — bỏ Leaderboard, ngôn ngữ thiết kế "Stadium Floodlights"

**Ngày:** 2026-08-28
**Trạng thái:** Đã duyệt bởi user, chờ chuyển sang implementation plan

## 1. Bối cảnh & mục tiêu

Vnext Football Hub là app nội bộ (React 19 qua esm.sh import-map, Tailwind CDN, build bằng
esbuild tuỳ biến — không dùng Next.js/Vite). App có 8 trang: Landing, Countdown, Member Home
(betting), Leaderboard, Team Divider, Tournament, Player Info, Admin Dashboard.

**Mục tiêu:**
1. Gỡ bỏ hoàn toàn phần *hiển thị* tính năng Leaderboard (route, trang, mục nav, i18n) —
   **giữ nguyên** hệ dữ liệu điểm/leaderboard phía backend vì Admin Dashboard và các luồng khác
   vẫn cần.
2. Redesign toàn bộ 8 trang theo một ngôn ngữ thiết kế mới: chuyên nghiệp, hiện đại, "wow",
   nhiều màu, có yếu tố 3D thật (WebGL), chủ đề bóng đá.

**Ngoài phạm vi (non-goals):**
- Không đổi kiến trúc dữ liệu Firebase, không đổi luồng nghiệp vụ (đặt cược, chia đội, giải đấu).
- Không thêm test suite tự động (repo hiện không có, không yêu cầu thêm).
- Không đổi routing slug hiện có (trừ việc xoá `/leaderboard`).
- Không thay bộ icon hiện tại (SVG tự vẽ) — mở rộng theo cùng phong cách thay vì đổi thư viện icon,
  để giảm rủi ro/độ trễ khi làm đồng loạt 8 trang.

## 2. Design system nền tảng

### 2.1 Bảng màu (thay thế các CSS variable trong `index.html`)

Giữ đúng kiến trúc hiện tại (CSS variables theo `:root` / `html.dark`, Tailwind đọc qua
`var(--color-*)`), chỉ đổi giá trị. Một accent duy nhất (họ cam/vàng ánh đèn sân) dùng nhất quán
toàn app; xanh sân cỏ là màu nền trung tính (thay slate).

**Dark (mặc định — đêm dưới đèn pha sân vận động):**
```
--color-primary:        #fb923c   /* cam ánh đèn pha */
--color-secondary:      #9fb8a8   /* sage muted */
--color-background:     #05140d   /* gần đen, ánh xanh sân cỏ */
--color-surface:        #0d2818   /* panel/card, có thể kết hợp glass */
--color-text-primary:   #f4f9f2
--color-text-secondary: #9fb8a8
--color-border:         rgba(255,255,255,0.08)
--color-accent-gold:    #fbbf24   /* cúp, huy hiệu, số liệu nổi bật — dùng tiết chế */
```

**Light (ban ngày trên sân cỏ):**
```
--color-primary:        #ea580c
--color-secondary:      #4b6358
--color-background:     #f4faf3
--color-surface:        #ffffff
--color-text-primary:   #0d2818
--color-text-secondary: #4b6358
--color-border:         #d7e6dc
```
`success`/`danger`/`warning` giữ nguyên giá trị hiện tại (đã đủ tương phản, không phải trọng tâm
redesign).

**Ràng buộc bắt buộc:** một màu accent (họ cam/vàng) dùng xuyên suốt toàn bộ 8 trang — không lệch
tông ở bất kỳ trang nào. Test contrast WCAG AA cho cả 2 theme trước khi merge.

### 2.2 Typography

- Giữ **Montserrat** cho body text (đã ổn định trong app, không đổi để giảm rủi ro hồi quy giao diện).
- Thêm 1 font display cô đọng-đậm kiểu bảng tỉ số thể thao cho H1/H2, số đếm ngược, tỉ số:
  **Bebas Neue** (ưu tiên) hoặc **Anton**, self-host qua Google Fonts `<link>` như font hiện tại
  (không dùng serif — không hợp ngữ cảnh thể thao/hiện đại).
- Scale: giữ hệ Tailwind mặc định, headline dùng `tracking-wide` cho font display để tránh dính
  chữ ở cỡ lớn.

### 2.3 Motion

- Thư viện: `motion` (Motion for React, cài qua npm — esbuild bundle được vì chỉ
  `react`/`react-dom`/`react-router-dom` bị external hoá trong `scripts/build.js`).
- Vi-tương tác (hover/press/enter) 150–300ms, easing spring nhẹ; chuyển trang tối đa 400ms.
- Toàn bộ animation tôn trọng `prefers-reduced-motion` (bắt buộc, không có ngoại lệ).
- Tilt-on-hover / glass panel dùng cho card ở các trang không có WebGL (xem mục 4).

### 2.4 Shape & elevation

- Một hệ bo góc: card/panel `rounded-2xl` (16px), button/badge `rounded-full`.
- Shadow tint theo nền (không dùng bóng đen thuần), token hoá 2–3 mức elevation dùng lại cho
  Button/Modal/Card.
- Component dùng chung cần cập nhật theo hệ mới: `components/shared/Button.tsx`,
  `components/shared/Modal.tsx`, `components/shared/ToggleSwitch.tsx`,
  `components/shared/LoadingSpinner.tsx`, `components/shared/ToastContainer.tsx`, `Header.tsx`.

## 3. Kiến trúc 3D (WebGL thật)

### 3.1 Dependency mới
- `three`, `@react-three/fiber`, `@react-three/drei` — cần chốt version tương thích React 19 tại
  thời điểm cài (fiber v9+ hỗ trợ React 19).
- Không dùng model 3D có sẵn (không có công cụ tạo asset GLTF) — dựng bằng hình học thủ tục:
  - Quả bóng: icosahedron/truncated-icosahedron + vật liệu emissive giả hiệu ứng đèn pha.
  - Cúp: ghép hình học cơ bản (cone + sphere + cylinder) cách điệu, không cần texture phức tạp.
- Ánh sáng: spotlight kiểu đèn pha sân + emissive material để tạo cảm giác "stadium" mà không cần
  postprocessing bloom nặng (bỏ `@react-three/postprocessing` để kiểm soát bundle size/hiệu năng).

### 3.2 Build config (thay đổi bắt buộc)
`scripts/build.js` hiện xuất **1 file `index.js` duy nhất** (`bundle: true`, `outfile`, không
splitting). Để 3D không kéo nặng các trang không dùng nó, cần đổi sang:
- `splitting: true`, `format: 'esm'`, dùng `outdir` thay vì `outfile`.
- Cập nhật `index.html`/entry để phù hợp với multi-file output của esbuild splitting.
- Các component 3D được `React.lazy()` + `Suspense` để tách chunk thật sự, không chỉ defer parse.
- `scripts/dev.js` cũng cần soát lại để dev server phục vụ đúng multi-chunk (kiểm tra khi vào
  writing-plans).

### 3.3 Fallback bắt buộc (không có ngoại lệ)
Tắt WebGL và thay bằng ảnh/gradient tĩnh + parallax CSS khi:
- `prefers-reduced-motion: reduce`.
- Heuristic thiết bị yếu: `navigator.deviceMemory < 4` hoặc `navigator.hardwareConcurrency <= 4`
  (khi API khả dụng — không chặn cứng trên trình duyệt không hỗ trợ).
- Khởi tạo WebGL context thất bại (bắt lỗi tại runtime).

Mỗi cảnh 3D là 1 component lá cô lập, cleanup `dispose()` cho geometry/material/renderer trong
`useEffect` return.

## 4. Áp dụng theo từng trang

| Trang | WebGL 3D thật | Xử lý còn lại |
|---|---|---|
| `pages/LandingPage.tsx` | ✅ Bóng/ánh đèn sân xoay thay ảnh nền `assets/stadium-bg.jpg` tĩnh | Giữ nguyên nội dung tài trợ/sự kiện/text, chỉ reskin theo palette+font mới, badge đội bóng thêm tilt-hover |
| `pages/CountdownPage.tsx` | ✅ Bóng 3D xoay khi đếm ngược | Số đếm dùng font display mới |
| `pages/TournamentPage.tsx` | ✅ (điểm nhấn) Bục cúp 3D cho trạng thái vô địch | Bảng xếp hạng/lịch thi đấu (`TeamStanding`, schedule) vẫn CSS-3D vì nhiều dữ liệu |
| `pages/MemberHomePage.tsx` (betting) | ❌ chỉ CSS-3D (tilt-hover `MatchCard`, glass panel) | Ưu tiên tốc độ/thao tác |
| `pages/TeamDividerPage.tsx` | ❌ chỉ CSS-3D | Giữ nguyên logic animation "fly to team" hiện có, chỉ reskin |
| `pages/PlayerInfoPage.tsx` | ❌ chỉ CSS-3D (tilt player card) | Restyle `PlayerSkillChart` theo palette mới |
| `pages/AdminDashboardPage.tsx` | ❌ CSS-3D nhẹ, ưu tiên chức năng | Không nhồi hiệu ứng nặng vào trang quản trị (nằm ngoài phạm vi UX cho dashboard dày dữ liệu) |

## 5. Gỡ Leaderboard

**Xoá:**
- `pages/LeaderboardPage.tsx`
- `components/LeaderboardTable.tsx`
- Route `/leaderboard` trong `App.tsx` (dòng import `LeaderboardPage` + `<Route path="/leaderboard">`)
- Mục nav "Leaderboard" trong `components/Header.tsx` (`NavLink` + import `UserGroupIcon` nếu
  không còn dùng ở nơi khác)
- Khoá i18n liên quan trong `locales/en.json` (13 khoá) và `locales/vi.json` (11 khoá)

**Sửa:**
- `pages/AdminDashboardPage.tsx`: câu mô tả "Users can view leaderboards..." /
  "...leaderboards are hidden..." — bỏ nhắc leaderboard, giữ đúng ý nghĩa còn lại (bet/points).

**Giữ nguyên (không đụng):**
- `types.ts`: `LeaderboardEntry`
- `services/firebaseService.ts`: `getFirebaseLeaderboardEntries`
- `contexts/AppContext.tsx`: `leaderboard`, `refreshLeaderboard`
- `App.tsx`: state `leaderboard`, hàm `refreshLeaderboard`, `updateUserPoints`

Lý do: hệ điểm vẫn là dữ liệu nghiệp vụ dùng ở nơi khác (Admin quản lý điểm user), chỉ gỡ giao
diện hiển thị bảng xếp hạng theo đúng lựa chọn của user.

## 6. Rủi ro & cách giảm thiểu

- **Bundle/perf regression do Three.js**: giảm thiểu bằng code-splitting bắt buộc (mục 3.2) +
  lazy load + fallback tắt hẳn WebGL trên thiết bị yếu.
- **Đổi build config (splitting) có thể phá dev/deploy flow hiện tại**: cần test kỹ
  `npm run dev` và `npm run deploy:hosting` sau khi đổi `scripts/build.js`/`scripts/dev.js`, trước
  khi coi là xong.
- **React 19 + @react-three/fiber version mismatch**: chốt version cụ thể khi cài, kiểm tra
  peer-dependency warning.
- **8 trang cùng lúc dễ tạo phong cách lệch nhau**: dùng chung 1 file token màu/spacing/shape
  (mở rộng cấu hình Tailwind trong `index.html` + các class dùng chung ở `components/shared/`)
  làm nguồn sự thật duy nhất, mọi trang tham chiếu từ đó.

## 7. Kiểm thử / rollout

Repo không có test suite tự động (chỉ có build script + Firebase). QA thủ công bắt buộc trước khi
coi là hoàn thành:
- Chạy `npm run dev`, đi qua đủ 8 trang ở cả 2 theme (sáng/tối).
- Bật `prefers-reduced-motion` (DevTools rendering emulation) — xác nhận toàn bộ animation/3D tắt
  gọn, không vỡ layout.
- Test màn hình 375px (mobile nhỏ) — xác nhận fallback 3D hoạt động, không tràn ngang.
- Kiểm tra Network tab: chunk Three.js/R3F chỉ tải ở đúng trang có 3D (Landing, Countdown,
  Tournament), không xuất hiện ở Admin/Member Home/Team Divider/Player Info.
- Chạy `npm run build` thành công, `npm run deploy:hosting` (khi user xác nhận muốn deploy) không
  lỗi với cấu hình splitting mới.

## 8. Phạm vi file bị ảnh hưởng (tổng hợp cho bước lập kế hoạch)

- `index.html` (Tailwind config colors, font-face, keyframes)
- `scripts/build.js`, `scripts/dev.js` (code splitting)
- `App.tsx`, `components/Header.tsx` (bỏ route/nav leaderboard)
- `pages/*.tsx` (cả 8 trang, reskin + 3D theo bảng mục 4)
- `components/shared/*.tsx` (Button, Modal, ToggleSwitch, LoadingSpinner, ToastContainer)
- `components/MatchCard.tsx`, `components/Tournament/*.tsx` (restyle theo token mới)
- `components/icons/index.tsx` (bổ sung icon mới nếu cần, giữ phong cách hiện tại)
- `locales/en.json`, `locales/vi.json` (xoá khoá leaderboard nav)
- Xoá: `pages/LeaderboardPage.tsx`, `components/LeaderboardTable.tsx`
- Thêm mới: component 3D scenes (vị trí đề xuất `components/three/` — chốt cụ thể ở bước lập kế
  hoạch), `package.json` (thêm `three`, `@react-three/fiber`, `@react-three/drei`, `motion`)
