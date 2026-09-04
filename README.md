# Web App Quản Lý Bill Shipper Lottee

PWA quản lý bill giao hàng Lottee: nhân viên nhập bill trong 2–3 giây, Admin
xem thống kê real-time, đối soát và thanh toán cuối tuần, xuất Excel.

Stack: **React + Vite**, **Firebase Authentication**, **Cloud Firestore**,
đóng gói PWA (thêm vào màn hình chính), host trên **GitHub Pages**.

---

## 1. Tạo project Firebase

1. Vào https://console.firebase.google.com → **Add project** → đặt tên (vd `lottee-bill-app`).
2. Vào **Build → Authentication → Get started** → tab **Sign-in method** → bật
   **Email/Password**.
3. Vào **Build → Firestore Database → Create database** → chọn chế độ
   **Production mode** → chọn region gần Việt Nam (vd `asia-southeast1`).
4. Vào **Project settings** (biểu tượng bánh răng) → cuộn xuống **Your apps**
   → bấm biểu tượng Web `</>` → đặt tên app → **Register app**.
   Copy đoạn `firebaseConfig` (apiKey, authDomain, projectId, ...) — sẽ dùng ở bước 3.

### Tạo tài khoản Admin đầu tiên

Vì app không có chức năng tự đăng ký, tài khoản Admin đầu tiên phải tạo thủ công:

1. **Authentication → Users → Add user** → nhập email + mật khẩu cho Admin.
2. Copy **User UID** vừa tạo.
3. Vào **Firestore Database → Start collection** → collection id: `users`
   → Document ID: dán UID vừa copy → thêm các field:
   - `name` (string): Tên admin, vd `Admin`
   - `role` (string): `admin`
   - `active` (boolean): `true`
4. (Tuỳ chọn) Tạo thêm document `config/settings` với field `prefix` (string),
   vd `39` — hoặc để trống và set qua trang **Cài đặt** trong app sau khi đăng
   nhập Admin.

Từ lúc này, Admin có thể đăng nhập vào app và **tự tạo tài khoản nhân viên**
qua trang **Cài đặt → Thêm nhân viên** (không cần vào Firebase Console nữa).

---

## 2. Áp dụng Firestore Security Rules

Trong Firebase Console → **Firestore Database → Rules**, dán nội dung file
[`firestore.rules`](./firestore.rules) trong repo này rồi **Publish**.

Nếu có cài [Firebase CLI](https://firebase.google.com/docs/cli), có thể deploy
rules + indexes bằng lệnh:

```bash
firebase login
firebase use --add          # chọn project vừa tạo
firebase deploy --only firestore
```

File [`firestore.indexes.json`](./firestore.indexes.json) định nghĩa sẵn các
composite index cần cho truy vấn "bill của 1 nhân viên trong 1 tuần" và
"xuất Excel theo nhân viên". Nếu không dùng CLI, khi app chạy lần đầu và
thiếu index, Firestore sẽ báo lỗi kèm link để tạo index đó trực tiếp trên
Console — chỉ cần bấm vào link là xong.

Rules đảm bảo:
- Nhân viên chỉ đọc được bill của chính mình; Admin đọc được tất cả.
- Nhân viên chỉ tạo được bill cho chính mình, không sửa/xoá được bill.
- Chỉ Admin mới sửa được trạng thái thanh toán, tiền tố, tài khoản nhân viên.
- Vì **ID của document bill = số bill đầy đủ** (vd `39125`), Firestore tự
  chặn trùng lặp ở tầng dữ liệu — kết hợp với transaction phía client để báo
  lỗi "Bill đã tồn tại." ngay lập tức.

---

## 3. Cấu hình project ở máy local

```bash
cd lottee-app
npm install
cp .env.example .env
```

Mở `.env` và dán các giá trị từ `firebaseConfig` ở bước 1:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Chạy thử ở local:

```bash
npm run dev
```

Mở http://localhost:5173, đăng nhập bằng tài khoản Admin đã tạo ở bước 1.

---

## 4. Deploy lên GitHub Pages

1. Tạo repo GitHub mới, vd `lottee-bill-app`, push code lên nhánh `main`.
2. **Sửa `vite.config.js`**: đổi `base: '/lottee-bill-app/'` thành đúng tên
   repo của bạn (nếu tên repo khác), và sửa tương ứng trong `App.jsx`
   (`<BrowserRouter basename="/lottee-bill-app">`) và `manifest` /
   `start_url`, `scope` trong `vite.config.js`.
3. Vào repo trên GitHub → **Settings → Pages** → phần **Build and deployment
   → Source** chọn **GitHub Actions**.
4. Vào **Settings → Secrets and variables → Actions → New repository secret**,
   thêm 6 secrets tương ứng với các biến trong `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Push lên `main` — workflow `.github/workflows/deploy.yml` sẽ tự build và
   deploy. Sau vài phút, app sẽ chạy tại:
   `https://<tên-github-của-bạn>.github.io/lottee-bill-app/`
6. Trong **Firebase Console → Authentication → Settings → Authorized
   domains**, thêm domain GitHub Pages ở trên (vd
   `<tên-github-của-bạn>.github.io`) để đăng nhập hoạt động.

---

## 5. Cài app lên màn hình chính điện thoại

- **Android (Chrome)**: mở link app → menu ⋮ → **Thêm vào Màn hình chính**.
- **iPhone (Safari)**: mở link app → nút Share (□↑) → **Thêm vào MH chính**.

App sẽ mở như 1 ứng dụng thông thường, không có thanh địa chỉ trình duyệt.

> Lưu ý: icon mặc định trong `public/icons/` chỉ là icon tạm (chữ "B" nền
> xanh). Bạn nên thay bằng logo công ty — chỉ cần thay 2 file
> `icon-192.png` và `icon-512.png` (đúng kích thước, nền không trong suốt).

---

## 6. Cấu trúc dữ liệu Firestore

```
users/{uid}
  name: string
  email: string
  role: "admin" | "employee"
  active: boolean

config/settings
  prefix: string        // vd "39"

bills/{billFull}         // doc ID = số bill đầy đủ, vd "39125" -> chống trùng
  billFull: string
  uid: string
  employeeName: string
  amount: 10000 | 15000
  status: "pending" | "paid"
  dateStr: "YYYY-MM-DD"
  timeStr: "HH:mm"
  monthStr: "YYYY-MM"
  week: number            // số tuần ISO trong năm
  year: number             // năm ISO (dùng cùng "week")
  createdAt: Timestamp
  paymentId: string | null

payments/{id}
  week: number
  year: number
  createdAt: Timestamp
  totalAmount: number
  billCount: number
  employees: [{ uid, name, count, total }]
```

---

## 7. Quy trình sử dụng

**Nhân viên**
1. Đăng nhập bằng tài khoản do Admin cấp.
2. Nhập 3 số cuối của bill → chọn 10.000đ hoặc 15.000đ → **Lưu**.
3. Nếu bill đã tồn tại (do nhập trùng hoặc đồng nghiệp đã nhập), hệ thống báo
   "Bill đã tồn tại." và không lưu.
4. Xem tổng bill / tổng tiền của tuần hiện tại ngay trên màn hình chính.

**Admin**
1. **Tổng quan**: xem số bill hôm nay/tuần này, số bill 10k/15k, tổng tiền
   cần thanh toán, số nhân viên hoạt động — cập nhật real-time.
2. **Nhân viên**: chọn tuần → xem bảng tổng hợp theo từng người → bấm vào tên
   để xem chi tiết từng bill.
3. **Thanh toán**: chọn tuần → xem danh sách bill chưa thanh toán theo nhân
   viên → bấm **Thanh toán** để đánh dấu toàn bộ bill trong tuần đó là
   `Đã thanh toán` (không bị tính lại ở các tuần sau) và lưu lịch sử vào
   `payments`.
4. **Xuất Excel**: chọn theo tuần / tháng / nhân viên → tải file `.xlsx` gồm
   sheet tổng hợp (theo từng nhân viên) và sheet chi tiết từng bill.
5. **Cài đặt**: đổi tiền tố bill khi Lottee chuyển dải số mới (vd `39` → `40`)
   và tạo/vô hiệu hoá tài khoản nhân viên.

---

## 8. Giới hạn & lưu ý

- Thiết kế cho quy mô dưới 20 nhân viên, dưới 100 bill/ngày — các truy vấn
  đọc toàn bộ bill trong tuần ở phía Admin phù hợp với quy mô này.
- Chỉ 2 mức tiền: 10.000đ và 15.000đ.
- Vô hiệu hoá nhân viên (`active: false`) chỉ chặn được việc dùng app (rule +
  màn hình chặn); nếu cần khoá đăng nhập hẳn, dùng thêm
  **Authentication → Disable user** trong Firebase Console.
