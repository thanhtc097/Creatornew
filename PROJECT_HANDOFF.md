# CreatorNew — Hồ sơ dự án

> Tài liệu tự chứa để lưu trữ, bàn giao và khôi phục ngữ cảnh phát triển dự án.
> Cập nhật theo mã nguồn hiện có ngày 05-09-2026.

## 1. Mục đích

**CreatorNew** là website bộ công cụ miễn phí cho creator tại `creatornew.com`. Phần lớn công cụ xử lý ngay trong trình duyệt; dự án cũng có thư viện prompt, tìm âm thanh/video có giấy phép rõ ràng và một công cụ xóa nền/xóa đối tượng bằng AI cục bộ.

## 2. Công nghệ và cấu trúc

| Thành phần | Công nghệ / vai trò |
| --- | --- |
| Website công cụ chính | HTML nhiều trang + JavaScript thuần + CSS dùng chung |
| Ứng dụng tìm audio | React 19 / Vite, dữ liệu Openverse |
| Ứng dụng tìm video | React 19 / Vite, dữ liệu Wikimedia Commons |
| Xóa đối tượng | ONNX Runtime Web trong Web Worker, model OpenCV LaMa chạy WASM trên thiết bị |
| Kiểm thử | Vitest (unit), Playwright (E2E) |
| SEO sitemap | Script Node.js và plugin WordPress |
| Build | Vite 8 |

Các thư mục quan trọng:

```text
index.html                         Trang chủ và điểm vào website chính
<ten-cong-cu>/index.html           Một trang cho mỗi công cụ HTML
css/                               CSS dùng chung và CSS theo tính năng
js/                                Logic JavaScript của các công cụ
js/background-remover/             Các mô-đun cho xóa nền/xóa đối tượng
src/                               Hai ứng dụng React tìm audio và video
free-sounds/, free-videos/         Mã nguồn entry riêng cho các app React
public/                            Ảnh, icon, dữ liệu prompt, model manifest, robots.txt
scripts/                           Đồng bộ dữ liệu, model và sitemap
tests/                             Unit/E2E tests
wordpress-plugin/                  Plugin sitemap và plugin đồng bộ prompt cho WordPress
specs/001-ai-background-logo-removal/  Đặc tả, kế hoạch, test gates của tính năng AI
dist/                              Kết quả build chính (không chỉnh tay)
```

## 3. Danh sách tính năng

### Công cụ ảnh và PDF

- Chuyển đổi ảnh: Image Converter, PNG → WebP, JPG → WebP, WebP → JPG.
- Nén ảnh, đổi kích thước ảnh, chuyển ảnh thành PDF.
- PDF: gộp, tách, xoay, xóa trang, PDF → JPG và PDF → PNG.
- Xóa nền ảnh.
- Xóa logo/đối tượng có ủy quyền: người dùng xác nhận quyền sở hữu và mục đích hợp lệ, khoanh vùng bằng mask, rồi xử lý cục bộ bằng LaMa.

### Công cụ nội dung và media

- AI Prompt Builder: tạo prompt có cấu trúc, thư viện prompt, tìm kiếm/lọc/sắp xếp, sao chép và tải prompt.
- Free Sounds: tìm, nghe thử, lọc giấy phép, tải và sao chép attribution từ Openverse.
- Free Videos: tìm video trên Wikimedia Commons, lọc điều kiện sử dụng, xem trước và sao chép attribution.
- Bài hướng dẫn chuyển đổi ảnh trực tuyến.

## 4. Khởi động và kiểm tra

Yêu cầu: Node.js tương thích với Vite 8 và npm. Cài dependencies một lần:

```powershell
npm install
```

Các lệnh thường dùng:

| Lệnh | Công dụng |
| --- | --- |
| `npm run dev` | Chạy môi trường phát triển Vite của website chính |
| `npm run build` | Đồng bộ prompt, kiểm tra model, build trang chính, sinh sitemap |
| `npm run build:offline` | Build không tải lại prompt từ mạng |
| `npm run build:media-apps` | Build riêng Free Sounds và Free Videos |
| `npm run model:fetch` | Tải model AI rồi kiểm tra checksum |
| `npm test` | Chạy unit test bằng Vitest |
| `npm run test:e2e` | Chạy E2E bằng Playwright |
| `npm run lint` | Chạy Oxlint |
| `npm run preview` | Xem bản production build cục bộ |

Quy trình kiểm tra khuyến nghị trước khi phát hành:

```powershell
npm run model:fetch
npm run lint
npm test
npm run build
npm run build:media-apps
npm run test:e2e
```

> `npm run build` sẽ thất bại nếu model AI chưa tồn tại hoặc checksum không khớp. Nếu chỉ cần build các phần không dùng AI, cần chủ động dùng quy trình phù hợp thay vì bỏ qua kiểm tra model một cách vô tình.

## 5. Build và triển khai

Build website chính dùng `vite.config.js`, với `base: './'`; đầu ra mặc định là `dist/`. Config này có entry cho trang chủ cùng mọi trang công cụ.

Free Sounds và Free Videos là hai build tách biệt:

- Mã nguồn: `free-sounds/` và `free-videos/`.
- Đầu ra: `free-sounds-dist/` và `free-videos-dist/`.
- Base URL dự kiến: `/free-sounds/` và `/free-videos/`.

Khi đưa lên hosting, bảo toàn cấu trúc thư mục URL của từng tool. Không chỉnh trực tiếp các thư mục build nếu thay đổi có thể được tái tạo từ source.

## 6. Dữ liệu, dịch vụ ngoài và quyền riêng tư

| Hạng mục | Nguồn / hành vi |
| --- | --- |
| Prompt cộng đồng | `prompts.chat` API; nếu lỗi, dùng CSV chính thức GitHub. Cache ở `public/data/prompts-chat.json`. |
| Audio | Openverse API. Kiểm tra giấy phép và attribution tại nguồn trước khi xuất bản. |
| Video | Wikimedia Commons API. Điều kiện license do người upload cung cấp, cần xác minh lại ở trang gốc. |
| Model xóa đối tượng | OpenCV `inpainting_lama`, artifact Apache-2.0; LaMa bởi Suvorov và cộng sự. |
| Ảnh xử lý AI | Được xử lý trong trình duyệt/Web Worker, không có upload ảnh/mask lên server của ứng dụng. |

Model được khai báo tại `public/models/inpainting-manifest.json`:

- Tệp: `inpainting_lama_2025jan.onnx`
- Kích thước tham chiếu: 92,600,000 bytes
- SHA-256: `7df918ac3921d3daf0aae1d219776cf0dc4e4935f035af81841b40adcf74fdf2`
- Backend hỗ trợ: WASM. WebGPU đã bị loại vì lỗi kernel `Add` trên Fourier path của artifact này.

Tệp `.onnx` bị loại khỏi source control; trước production build phải chạy `npm run model:fetch`. Khi triển khai, kiểm tra checksum, `Content-Type`, CORS, cache bất biến và khả năng worker truy cập model.

## 7. Sitemap và WordPress

`scripts/generate-tools-sitemap.mjs` tạo `tools-sitemap.xml` từ trang build có canonical hợp lệ trên `https://creatornew.com/`, loại trang `noindex`, rồi sao chép sitemap về root dự án.

Plugin `wordpress-plugin/creatornew-tools-sitemap/` thêm endpoint `/tools-sitemap.xml` vào sitemap index Rank Math. Khi plugin này hoạt động, **không upload file `tools-sitemap.xml` tĩnh** vào WordPress `public_html`, vì plugin tạo endpoint động cùng tên.

Plugin `wordpress-plugin/creatornew-prompt-sync/` đồng bộ dữ liệu prompt vào `/data/prompts-chat.json` bằng WP-Cron (mỗi 30 phút, phụ thuộc traffic). Cài và kích hoạt plugin trong WordPress trước khi dùng đồng bộ phía server.

`public/robots.txt` tham chiếu hai sitemap:

```text
https://creatornew.com/sitemap_index.xml
https://creatornew.com/tools-sitemap.xml
```

## 8. Vị trí nên chỉnh sửa theo loại thay đổi

| Muốn thay đổi | Nơi bắt đầu |
| --- | --- |
| Giao diện chung | `index.html`, `css/style.css` |
| Một công cụ HTML | `<slug>/index.html` + file logic liên quan trong `js/` |
| Tạo/thay đổi prompt | `ai-prompt-builder/index.html`, `js/ai-prompt-builder.js`, CSS prompt |
| Xóa nền/xóa đối tượng | `background-remover/index.html`, `js/background-remover.js`, `js/background-remover/`, `css/background-remover.css` |
| Audio app | `src/App.jsx`, `src/App.css`, `src/main.jsx`, `free-sounds/` |
| Video app | `src/VideoApp.jsx`, `src/VideoApp.css`, `src/video-main.jsx`, `free-videos/` |
| Danh sách tool cho sitemap | `wordpress-plugin/creatornew-tools-sitemap/tools.json` |
| Dữ liệu prompt | `public/data/prompts-chat.json`; ưu tiên sinh bằng `npm run sync:prompts` |
| Sitemap | `scripts/generate-tools-sitemap.mjs`; ưu tiên sinh bằng build |

## 9. Lưu ý bảo trì

- Có sẵn các tệp ZIP và thư mục bản build; coi đây là artifact phát hành/backup, không phải nguồn chỉnh sửa chính.
- Thư mục `old-version/`, `tmp/`, `test-results/` phục vụ lịch sử hoặc tạm thời; kiểm tra kỹ trước khi đưa vào deployment.
- Khi thêm tool mới: thêm entry Vite, tạo HTML + script/CSS, thêm slug vào `tools.json` nếu tool cần sitemap, rồi build để xác minh canonical và sitemap.
- Giữ nguyên các kiểm soát quyền sở hữu/mục đích của chế độ xóa đối tượng; đây là một ràng buộc sản phẩm, không chỉ là UI.
- Không thay model hoặc backend AI chỉ bằng URL; cập nhật manifest, license/attribution, checksum, kiểm thử tương thích Web Worker và test/regression liên quan.

## 10. Trạng thái workspace tại thời điểm đóng gói

Workspace có thay đổi cục bộ/chưa được Git theo dõi, bao gồm chỉnh sửa `index.html`, `css/style.css`, xóa `js/app.js`, cùng nhiều tệp/tính năng mới chưa được add. Đây là thông tin hiện trạng để tránh vô tình mất phần việc đang dang dở; hãy review `git status` trước khi commit hoặc triển khai.

## 11. Checklist bàn giao nhanh

- [ ] Cài dependencies bằng `npm install`.
- [ ] Lấy đúng model bằng `npm run model:fetch`.
- [ ] Chạy lint và test.
- [ ] Build main site và hai media app.
- [ ] Mở thử tất cả URL tool quan trọng trên môi trường staging.
- [ ] Xác minh sitemap, canonical, robots và cache/CDN.
- [ ] Xác minh model có checksum, CORS và worker access đúng trong production.
- [ ] Với WordPress, chỉ dùng một nguồn `/tools-sitemap.xml`: plugin động hoặc file tĩnh, không dùng cả hai.
