## Mục tiêu
Rà soát toàn bộ các trang, liệt kê các lỗi UI/UX/HCI hiện đang có và cải thiện đồng bộ. Không thay đổi schema, không cần secret mới.

## Các vấn đề phát hiện theo trang

### 1. AppLayout (thanh điều hướng & header)
- Thanh nav nổi (mobile) đè lên FAB "ẩn nav" và lên cả nội dung; padding bottom hiện cố định kể cả ở desktop gây khoảng trống lớn.
- Trên desktop nav vẫn dùng grid 6 cột chật, nhãn dễ bị truncate.
- Header chip avatar trên mobile bị tràn khi tên dài; không có liên kết "Phụ huynh" trên mobile (chỉ desktop).
- Skip-link "Đến nội dung chính" không scroll mượt đến `#main`.
- Thiếu trạng thái active rõ ràng cho nav khi reduced-motion (mất hiệu ứng).

### 2. Landing
- Nút "Trang phụ huynh" và "Bắt đầu học" cùng dẫn tới `/auth` → trùng lặp, gây nhầm.
- Mascot bubble luôn float ngay cả khi `prefers-reduced-motion`.
- Hero chưa có alt text mô tả (chỉ alt rỗng), `EmotionBubble` ở landing kích hoạt giọng đọc mỗi lần click do mặc định `speakOnClick=true` (bất ngờ với người chưa đăng nhập).

### 3. Auth
- Toast lỗi không phân biệt loại (dùng `toast()` thay vì `toast.error()`); nhập tên/PIN sai không có aria-live.
- `Enter` không submit form (không bọc trong `<form onSubmit>`).
- Input PIN nên có `type="password"` hoặc nút hiện/ẩn — hiện đang lộ PIN.
- Không có liên kết "Quên PIN?" hoặc thông báo về việc PIN không thể khôi phục.

### 4. ChildHome
- Nút "Tiếp tục" luôn trỏ `/app/learn` mà không tính đến bài hiện tại; thiếu gợi ý cụ thể.
- Lưới tile thiếu skeleton trong khi `useProfile` đang load → tên nhấp nháy "bạn nhỏ".
- Không tôn trọng `reduced_motion` cho `motion.div` initial animation.

### 5. LearningMap
- Bài 7 ("Bình tĩnh lại") có `threshold: 99` nên gần như không đạt → người dùng không biết tại sao luôn locked. Cần threshold hợp lý hoặc gắn `activity` riêng.
- Bài 7 trỏ về `/app/journal` nhưng `activity: "scenario"` → lệch dữ liệu, đếm sai.
- Thiếu thanh tiến độ tổng (X/Y bài đã hoàn thành).
- Thiếu badge số sao thưởng cho bài học.

### 6. Flashcards
- Tự đọc khi vào trang có thể bị chặn ở iOS Safari (autoplay policy) → nên đợi tương tác đầu hoặc dùng nút loa.
- Nút "Trước/Tiếp" không có `aria-keyshortcuts`, thiếu hỗ trợ phím mũi tên.
- Sau khi học hết 7 thẻ vẫn quay vòng im lặng — thiếu màn "Hoàn thành" có CTA.
- Toast +1 sao bắn liên tục khi bấm "Mình hiểu rồi" trên thẻ đã `seen` (không), nhưng nếu user spam thì không có throttle ở UI.

### 7. MatchingGame
- Khi hoàn thành, không reset/đề nghị chơi tiếp; nút "Chơi lại" nằm xa.
- Nhãn cảm xúc thiếu `aria-label` rõ ràng (chỉ có text, ổn) nhưng disabled state mất đường viền focus.
- Khi chọn khuôn mặt rồi chọn đúng → khoảng nghỉ 400ms trước toast hoàn thành cảm thấy giật. Nên dùng `useEffect([matched])`.
- Không có cách bỏ chọn khuôn mặt đã chọn (bấm lại để toggle).

### 8. Scenarios
- Sau khi trả lời sai vẫn có thể bấm bubble khác (đã chặn bằng `if (pick) return`) nhưng không có nút "Thử lại" với cùng câu chuyện — bị ép sang câu mới.
- Tự đọc text khi đổi scene có thể chồng tiếng — đã `stop()` nhưng iOS vẫn chặn lần đầu (cần lazy đọc sau click đầu).
- Khi sai, không hiển thị đáp án đúng là cảm xúc nào.

### 9. CameraPractice
- Tự đọc prompt khi vào trang trước khi user tương tác → bị chặn iOS.
- Nút "Kiểm tra khuôn mặt" trong khi camera tắt thì ẩn — nhưng khi `analyzing` không có overlay loading trên video.
- Khi `error` hiện, không tự ẩn khi user retry; xếp chồng nhiều lỗi.
- Không có nút "Bỏ qua mục tiêu" khi bé không thể thể hiện được → dễ nản.
- Thiếu indicator "đã làm X/Y" trong phiên.

### 10. Journal
- `load()` không filter theo `user_id` (RLS chắc đã lo, nhưng phụ thuộc); thiếu loading skeleton.
- Không có nút xóa entry, không có lọc theo cảm xúc.
- Textarea không tự cao theo nội dung; thiếu `maxLength` + đếm ký tự.
- Trên mobile, nút loa câu hỏi bị ẩn (`hidden md:inline-flex`) → trẻ không thể nghe.

### 11. Rewards
- Không có thanh tiến độ đến mốc kế tiếp (bao nhiêu sao nữa thì mở sticker mới).
- Sticker đã đạt và chưa đạt khác biệt thị giác chỉ qua opacity/grayscale → dễ bỏ sót (thêm badge "Mới đạt").
- Thiếu hiệu ứng nhẹ khi vừa mở khóa sticker (confetti hoặc highlight).

### 12. ParentDashboard
- `select("*")` trên `progress` không filter `user_id` (lại dựa hoàn toàn vào RLS) — nên giới hạn rõ.
- Biểu đồ rỗng chỉ hiện chữ; không hướng dẫn hành động (CTA mở bài học).
- Pie chart chú thích đè lên biểu đồ ở mobile (Legend mặc định ở dưới nhưng cao 260px khít).
- Không có khoảng thời gian filter (7 ngày / 30 ngày / tất cả) — chỉ "Toàn bộ".
- Khi `loadingAI` thiếu placeholder skeleton.

### 13. Vấn đề toàn cục
- Toast: thiếu `duration` thống nhất, đôi nơi dùng `toast()` cho lỗi (nên `toast.error`).
- Không có ErrorBoundary cho route → bug 1 trang trắng cả app.
- Nhiều hover effect dùng `hover:` không đi kèm `focus:` tương đương → không thể truy cập bằng bàn phím.
- Một số nút < 44px (chip ngôi sao, nút loa header) — không đạt target chạm WCAG.
- Thiếu meta theme-color / favicon kiểm tra; status bar mobile có thể nhợt.

## Các thay đổi sẽ thực hiện

### A. Thanh điều hướng & layout
- AppLayout: tăng max-width nav desktop, dùng `flex` thay vì grid 6 cột để label không bị truncate; padding-bottom main giảm khi desktop; thêm "Phụ huynh" vào nav mobile (icon chart) thay vì ẩn.
- Header: rút gọn chip avatar trên mobile (hide name nếu > 8 ký tự), tăng chip ngôi sao tap target ≥ 44px.

### B. Auth
- Bọc form `<form onSubmit>` để Enter submit; PIN dùng `type="password"` + nút mắt.
- `toast.error` cho lỗi; thêm `aria-live` cho khu vực thông báo.
- Thêm dòng ghi chú "PIN sẽ không thể khôi phục, hãy nhớ kỹ" cho signup.

### C. Landing
- Nút thứ 2 đổi thành scroll xuống section tính năng (anchor `#features`) hoặc liên kết về cùng `/auth?role=parent`.
- Mascot float = `!reducedMotion` (lấy từ `useProfile` nếu có; landing không yêu cầu auth — fallback theo `prefers-reduced-motion` qua `matchMedia`).
- Tắt `speakOnClick` cho EmotionBubble ở landing.

### D. ChildHome
- Tính `nextLesson` từ tiến độ thật (giống LearningMap) → CTA "Tiếp tục bài N: …".
- Thêm skeleton khi profile chưa load.
- Bọc motion bằng check `reduced_motion`.

### E. LearningMap
- Sửa bài 7: gắn `activity: "journal"` mới hoặc đặt threshold = 1 và dùng dữ liệu `journal_entries.count`. Đơn giản nhất: đổi `activity: "scenario"`, `threshold: 6` để có lộ trình rõ.
- Thêm progress header "X/Y bài đã hoàn thành" + thanh ngang.
- Thêm badge số sao mỗi bài (gợi ý phần thưởng).

### F. Flashcards
- Bỏ auto-speak khi vừa mở; chỉ đọc khi user bấm nút loa hoặc đã tương tác (cờ trong sessionStorage).
- Hỗ trợ phím ←/→ chuyển thẻ, Space phát âm.
- Khi `i + 1 === EMOTIONS.length` và `seen.size === EMOTIONS.length` → màn "Hoàn thành" có CTA về LearningMap.

### G. MatchingGame
- Dùng `useEffect([matched])` để bắn toast hoàn thành đáng tin cậy.
- Cho phép bấm lại khuôn mặt đang chọn để bỏ chọn.
- Khi hoàn tất, thêm card overlay "Hoàn thành" với nút "Chơi lại" / "Tiếp tục".

### H. Scenarios
- Sau khi sai, hiển thị badge "Đáp án: [Cảm xúc]" và nút "Thử câu chuyện khác".
- Lazy auto-speak: chỉ đọc sau lần click đầu tiên; trước đó hiển thị hint "Bấm 🔊 để nghe".

### I. CameraPractice
- Auto-speak prompt chỉ chạy sau khi `on === true` (đã tương tác bật camera).
- Thêm overlay loading mờ trên video khi `analyzing`.
- Reset `error` khi đổi prompt / bật camera lại.
- Thêm nút "Bỏ qua".
- Thêm bộ đếm "X/Y mục tiêu" trong phiên.

### J. Journal
- Thêm filter user_id rõ ràng `.eq("user_id", user.id)`.
- Bỏ `hidden md:inline-flex` cho nút loa.
- Textarea autosize + counter (`maxLength=300`).
- Nút xóa entry (with confirm) qua `AlertDialog`.

### K. Rewards
- Mốc kế tiếp: card lớn nhất hiển thị "Còn N⭐ nữa để mở [sticker]" + thanh progress.
- Highlight nhẹ (ring + sparkle) cho sticker vừa mở khóa (so với localStorage).

### L. ParentDashboard
- `.eq("user_id", user.id)` cho cả 2 query.
- Bộ chọn khoảng thời gian: 7 / 30 / Tất cả (lọc ở client).
- Empty state có CTA `Link to="/app/learn"`.
- Pie chart: tăng height lên 320 mobile, Legend `verticalAlign="bottom"` + `wrapperStyle paddingTop`.

### M. Toàn cục
- Tạo `ErrorBoundary` đơn giản, bọc `<Outlet/>` trong AppLayout.
- Chuẩn hoá toast: helper `notify.success/error/info` với duration mặc định 1800ms, error 2400ms.
- Đảm bảo các nút icon (loa, chip) có `min-w-[44px] min-h-[44px]`.
- Bổ sung `<meta name="theme-color">` ở `index.html` khớp tông sky.

## Tệp dự kiến chỉnh sửa
```
src/components/AppLayout.tsx
src/components/ErrorBoundary.tsx          (mới)
src/lib/notify.ts                         (mới)
src/lib/useReducedMotion.ts               (mới, fallback matchMedia)
src/pages/Landing.tsx
src/pages/Auth.tsx
src/pages/ChildHome.tsx
src/pages/LearningMap.tsx
src/pages/Flashcards.tsx
src/pages/MatchingGame.tsx
src/pages/Scenarios.tsx
src/pages/CameraPractice.tsx
src/pages/Journal.tsx
src/pages/Rewards.tsx
src/pages/ParentDashboard.tsx
index.html                                (theme-color)
```

## Không thay đổi
- Không sửa schema cơ sở dữ liệu.
- Không tác động edge functions.
- Không thay logic xác thực ngoài UI form.
