(function () {
  'use strict'

  const STORAGE_KEY = 'creatornew-language'
  const translations = {
    'Skip to tools': 'Đi đến công cụ',
    'Image Tools': 'Công cụ ảnh',
    'PDF Tools': 'Công cụ PDF',
    'Audio Tools': 'Công cụ âm thanh',
    'Video Tools': 'Công cụ video',
    'Why CreatorNew': 'Vì sao chọn CreatorNew',
    'FAQ': 'Câu hỏi thường gặp',
    'Convert JPG, PNG and WebP': 'Chuyển đổi JPG, PNG và WebP',
    'Create transparent PNGs': 'Tạo ảnh PNG nền trong suốt',
    'Lightweight web images': 'Ảnh nhẹ hơn cho website',
    'Optimize photos for web': 'Tối ưu ảnh cho website',
    'Improve compatibility': 'Tăng khả năng tương thích',
    'Reduce image file size': 'Giảm dung lượng ảnh',
    'Resize for any platform': 'Đổi kích thước cho mọi nền tảng',
    'Combine images into one PDF': 'Ghép ảnh thành một file PDF',
    'Combine multiple PDF files': 'Ghép nhiều file PDF',
    'Extract selected pages': 'Trích xuất các trang đã chọn',
    'Convert PDF pages to JPG': 'Chuyển trang PDF thành JPG',
    'Convert PDF pages to PNG': 'Chuyển trang PDF thành PNG',
    'Rotate PDF pages': 'Xoay trang PDF',
    'Remove unwanted pages': 'Xóa các trang không cần thiết',
    'Find free music and sound effects': 'Tìm nhạc và hiệu ứng âm thanh miễn phí',
    'Find reusable videos with license details': 'Tìm video có thể tái sử dụng kèm giấy phép',
    'Free online tools for everyone': 'Bộ công cụ online miễn phí cho mọi người',
    'Free online tools for': 'Công cụ online miễn phí cho',
    'everyday digital tasks': 'công việc số hằng ngày',
    'Convert and optimize images, edit PDFs, find reusable audio and video, and build AI prompts. Simple tools for work, study and creative projects—no registration required.': 'Chuyển đổi và tối ưu ảnh, chỉnh sửa PDF, tìm âm thanh và video có thể tái sử dụng, đồng thời tạo prompt AI. Công cụ đơn giản cho công việc, học tập và dự án sáng tạo—không cần đăng ký.',
    'Explore Free Tools': 'Khám phá công cụ miễn phí',
    'Open Image Converter': 'Mở công cụ chuyển đổi ảnh',
    'Browser-based tools': 'Xử lý trên trình duyệt',
    'No registration': 'Không cần đăng ký',
    'Clear media licenses': 'Giấy phép nội dung rõ ràng',
    'Quick access': 'Truy cập nhanh',
    'What do you want to do?': 'Bạn muốn làm gì?',
    'Free tools': 'Công cụ miễn phí',
    'Image Converter': 'Chuyển đổi ảnh',
    'Compressor': 'Nén ảnh',
    'Reduce file size': 'Giảm dung lượng file',
    'Image Resizer': 'Đổi kích thước ảnh',
    'Skip to converter': 'Đi đến công cụ chuyển đổi',
    'Skip to background remover': 'Đi đến công cụ xóa nền',
    'Free creator tool': 'Công cụ sáng tạo miễn phí',
    'fast and privately': 'nhanh chóng và riêng tư',
    'automatically': 'tự động',
    'Drop your images here': 'Thả ảnh của bạn vào đây',
    'Drop an image here': 'Thả một ảnh vào đây',
    'Or select multiple JPG, PNG or WebP images from your device': 'Hoặc chọn nhiều ảnh JPG, PNG hoặc WebP từ thiết bị',
    'No registration, no server uploads, and completely free.': 'Không cần đăng ký, không tải lên máy chủ và hoàn toàn miễn phí.',
    '＋ Add Images': '＋ Thêm ảnh',
    '+ Choose Image': '+ Chọn ảnh',
    'images selected': 'ảnh đã chọn',
    '+ Add More': '+ Thêm ảnh',
    'Clear All': 'Xóa tất cả',
    'Clear': 'Xóa',
    'Output format': 'Định dạng đầu ra',
    'Image quality': 'Chất lượng ảnh',
    'Compression level': 'Mức nén',
    'Convert All Images': 'Chuyển đổi tất cả ảnh',
    'Compress All Images': 'Nén tất cả ảnh',
    'Resize All Images': 'Đổi kích thước tất cả ảnh',
    'Download All': 'Tải xuống tất cả',
    'Remove Background': 'Xóa nền',
    'Remove background': 'Xóa nền',
    'Erase owned logo/object': 'Xóa logo/vật thể được phép',
    'Use this tool only on images you may edit': 'Chỉ dùng công cụ với ảnh bạn được phép chỉnh sửa',
    'I own this image or have permission to edit it.': 'Tôi sở hữu ảnh này hoặc được phép chỉnh sửa.',
    'I am trying to remove a third-party watermark or rights-management mark.': 'Tôi đang cố xóa watermark hoặc dấu quản lý quyền của bên thứ ba.',
    'Add mask': 'Thêm vùng chọn',
    'Erase mask': 'Xóa vùng chọn',
    'Brush size': 'Kích thước cọ',
    'Undo': 'Hoàn tác',
    'Redo': 'Làm lại',
    'Clear mask': 'Xóa vùng chọn',
    'Erase selected object': 'Xóa vật thể đã chọn',
    'Cancel': 'Hủy',
    'Large image': 'Ảnh kích thước lớn',
    'Continue with reduced copy': 'Tiếp tục với bản giảm kích thước',
    'Download Transparent PNG': 'Tải PNG nền trong suốt',
    'Ready to remove the background.': 'Sẵn sàng xóa nền.',
    'How to convert images online': 'Cách chuyển đổi ảnh online',
    'How to convert PNG to WebP online': 'Cách chuyển PNG sang WebP online',
    'How to convert JPG to WebP online': 'Cách chuyển JPG sang WebP online',
    'How to convert WebP to JPG online': 'Cách chuyển WebP sang JPG online',
    'How to compress images online': 'Cách nén ảnh online',
    'How to resize images online': 'Cách đổi kích thước ảnh online',
    'How to remove an image background': 'Cách xóa nền ảnh',
    'Add your images': 'Thêm ảnh',
    'Add an image': 'Thêm một ảnh',
    'Choose a format': 'Chọn định dạng',
    'Adjust WebP quality': 'Điều chỉnh chất lượng WebP',
    'Adjust JPG quality': 'Điều chỉnh chất lượng JPG',
    'Adjust compression': 'Điều chỉnh mức nén',
    'Enter target dimensions': 'Nhập kích thước mong muốn',
    'Convert and download': 'Chuyển đổi và tải xuống',
    'Compress and download': 'Nén và tải xuống',
    'Resize and download': 'Đổi kích thước và tải xuống',
    'Run the AI model': 'Chạy mô hình AI',
    'Download PNG': 'Tải xuống PNG',
    'Private by design': 'Riêng tư ngay từ thiết kế',
    'Batch conversion': 'Chuyển đổi hàng loạt',
    'No account needed': 'Không cần tài khoản',
    'Choose the right image format': 'Chọn đúng định dạng ảnh',
    'Which image formats are supported?': 'Những định dạng ảnh nào được hỗ trợ?',
    'Can I convert several images at once?': 'Tôi có thể xử lý nhiều ảnh cùng lúc không?',
    'Related creator tools': 'Các công cụ sáng tạo liên quan',
    'Custom size': 'Kích thước tùy chỉnh',
    'Width (px)': 'Chiều rộng (px)',
    'Height (px)': 'Chiều cao (px)',
    'Tips for cleaner results': 'Mẹo để có kết quả tốt hơn',
    'Use clear edges': 'Sử dụng ảnh có đường viền rõ',
    'Avoid busy scenes': 'Tránh hậu cảnh phức tạp',
    'Allow the first download': 'Chờ tải mô hình lần đầu',
    'Is the background remover free?': 'Công cụ xóa nền có miễn phí không?',
    'Are my images uploaded?': 'Ảnh của tôi có được tải lên không?',
    'Why does the first result take longer?': 'Tại sao kết quả đầu tiên lâu hơn?',
    'Which formats are supported?': 'Những định dạng nào được hỗ trợ?',
    'Free PDF tool': 'Công cụ PDF miễn phí',
    'one PDF': 'một file PDF',
    'in your browser': 'ngay trên trình duyệt',
    'your way': 'theo cách của bạn',
    'pages to JPG': 'các trang sang JPG',
    'pages to PNG': 'các trang sang PNG',
    'pages visually': 'trực quan từng trang',
    'PDF pages': 'trang PDF',
    '+ Add More Images': '+ Thêm ảnh',
    'Create PDF': 'Tạo PDF',
    'Drop your PDF files here': 'Thả các file PDF vào đây',
    'Select at least two PDF documents to combine': 'Chọn ít nhất hai tài liệu PDF để ghép',
    '+ Add PDF Files': '+ Thêm file PDF',
    'Files are processed only on your device': 'File chỉ được xử lý trên thiết bị của bạn',
    'PDFs selected': 'file PDF đã chọn',
    '+ Add More PDFs': '+ Thêm PDF',
    'Merge PDF Files': 'Ghép các file PDF',
    'Merged PDF ready': 'File PDF đã ghép xong',
    'Review your PDF': 'Xem lại PDF',
    'Download PDF': 'Tải PDF',
    'Drop one PDF here': 'Thả một file PDF vào đây',
    'Select a PDF up to 100 MB': 'Chọn file PDF tối đa 100 MB',
    '+ Choose PDF': '+ Chọn PDF',
    'Your PDF stays on your device': 'PDF được giữ trên thiết bị của bạn',
    'Replace PDF': 'Thay PDF',
    'Pages to extract': 'Các trang cần trích xuất',
    'Pages to delete': 'Các trang cần xóa',
    'Select All': 'Chọn tất cả',
    'Clear Selection': 'Bỏ chọn',
    'Select pages': 'Chọn trang',
    'Open full PDF preview': 'Mở bản xem trước PDF đầy đủ',
    'Extract Selected Pages': 'Trích xuất các trang đã chọn',
    'Delete Selected Pages': 'Xóa các trang đã chọn',
    'Split PDF ready': 'File PDF đã tách xong',
    'Review extracted pages': 'Xem lại các trang đã trích xuất',
    'Review cleaned PDF': 'Xem lại PDF đã làm sạch',
    'JPG quality': 'Chất lượng JPG',
    'PNG output': 'Đầu ra PNG',
    'Good - smaller file': 'Tốt - file nhỏ hơn',
    'High - recommended': 'Cao - khuyên dùng',
    'Maximum': 'Tối đa',
    'PNG - lossless': 'PNG - không mất dữ liệu',
    'Convert Pages to JPG': 'Chuyển các trang sang JPG',
    'Convert Pages to PNG': 'Chuyển các trang sang PNG',
    'Rotate All Left': 'Xoay tất cả sang trái',
    'Rotate All Right': 'Xoay tất cả sang phải',
    'Create Rotated PDF': 'Tạo PDF đã xoay',
    'Rotated PDF ready': 'PDF đã xoay xong',
    'How to convert images to PDF': 'Cách chuyển ảnh sang PDF',
    'How to merge PDF files': 'Cách ghép file PDF',
    'How to split a PDF': 'Cách tách file PDF',
    'How to convert PDF to JPG': 'Cách chuyển PDF sang JPG',
    'How to convert PDF to PNG': 'Cách chuyển PDF sang PNG',
    'How to delete PDF pages': 'Cách xóa trang PDF',
    'Add images': 'Thêm ảnh',
    'Add PDF files': 'Thêm file PDF',
    'Add one PDF': 'Thêm một file PDF',
    'Add PDF': 'Thêm PDF',
    'Arrange the pages': 'Sắp xếp các trang',
    'Arrange their order': 'Sắp xếp thứ tự',
    'Choose page ranges': 'Chọn phạm vi trang',
    'Create your PDF': 'Tạo file PDF',
    'Merge and download': 'Ghép và tải xuống',
    'Review and download': 'Xem lại và tải xuống',
    'Download': 'Tải xuống',
    'Files stay private': 'File luôn riêng tư',
    'One organized file': 'Một file được sắp xếp gọn gàng',
    'Fast and free': 'Nhanh chóng và miễn phí',
    'Pages stay intact': 'Giữ nguyên các trang',
    'No setup required': 'Không cần cài đặt',
    'Are my PDFs uploaded?': 'PDF của tôi có được tải lên không?',
    'Are PDFs uploaded?': 'PDF có được tải lên không?',
    'Are files uploaded?': 'File có được tải lên không?',
    'Can I change the document order?': 'Tôi có thể đổi thứ tự tài liệu không?',
    'Can I change the page order?': 'Tôi có thể đổi thứ tự trang không?',
    'How do I select pages?': 'Làm thế nào để chọn trang?',
    'Are password-protected PDFs supported?': 'Có hỗ trợ PDF được bảo vệ bằng mật khẩu không?',
    'Open audio library': 'Thư viện âm thanh mở',
    'Open video library': 'Thư viện video mở',
    'About CC licenses': 'Thông tin giấy phép CC',
    'Open audio for big ideas': 'Âm thanh mở cho ý tưởng lớn',
    'Free sounds for creators': 'Âm thanh miễn phí cho nhà sáng tạo',
    'Free sound effects.': 'Hiệu ứng âm thanh miễn phí.',
    'Music for every project.': 'Âm nhạc cho mọi dự án.',
    'Find the right sound.': 'Tìm đúng âm thanh.',
    'Use it with confidence.': 'Tự tin sử dụng.',
    'Explore Creative Commons music and sound effects for your next project.': 'Khám phá nhạc và hiệu ứng âm thanh Creative Commons cho dự án tiếp theo.',
    'Preview audio, check the license and download in seconds.': 'Nghe thử, kiểm tra giấy phép và tải xuống trong vài giây.',
    'Search rain, piano, whoosh, podcast intro...': 'Tìm tiếng mưa, piano, hiệu ứng, nhạc podcast...',
    'All licenses': 'Tất cả giấy phép',
    'Free use (CC0 / Public Domain)': 'Sử dụng tự do (CC0 / Phạm vi công cộng)',
    'CC BY — attribution required': 'CC BY — yêu cầu ghi nguồn',
    'CC BY-SA — share alike': 'CC BY-SA — chia sẻ tương tự',
    'Noncommercial use': 'Sử dụng phi thương mại',
    'Search': 'Tìm kiếm',
    'Try:': 'Gợi ý:',
    'Rain sounds': 'Tiếng mưa',
    'Relaxing piano': 'Piano thư giãn',
    'Nature sounds': 'Âm thanh thiên nhiên',
    'Podcast intro': 'Nhạc mở đầu podcast',
    'Verified open sources': 'Nguồn mở đã xác minh',
    'Clear license details': 'Giấy phép rõ ràng',
    'POPULAR AUDIO': 'ÂM THANH PHỔ BIẾN',
    'Popular music for creator projects': 'Nhạc phổ biến cho dự án sáng tạo',
    'View all results': 'Xem tất cả kết quả',
    'Preview and choose': 'Nghe thử và lựa chọn',
    'Download and attribute': 'Tải xuống và ghi nguồn',
    'Enter the music or sound effect you need.': 'Nhập loại nhạc hoặc hiệu ứng âm thanh bạn cần.',
    'Preview tracks and filter by usage rights.': 'Nghe thử và lọc theo quyền sử dụng.',
    'Download the original and copy attribution details.': 'Tải file gốc và sao chép thông tin ghi nguồn.',
    'Copy attribution': 'Sao chép ghi nguồn',
    'Downloading...': 'Đang tải xuống...',
    'SEARCH RESULTS': 'KẾT QUẢ TÌM KIẾM',
    'Searching the audio library...': 'Đang tìm trong thư viện âm thanh...',
    'Data source:': 'Nguồn dữ liệu:',
    'Unable to load results': 'Không thể tải kết quả',
    'Try again': 'Thử lại',
    'No matching audio found': 'Không tìm thấy âm thanh phù hợp',
    'Try a broader keyword or another license.': 'Hãy thử từ khóa rộng hơn hoặc giấy phép khác.',
    'Previous': 'Trước',
    'Next page': 'Trang sau',
    'Audio belongs to its respective creators. Always verify the source license before publishing.': 'Âm thanh thuộc về tác giả tương ứng. Luôn kiểm tra giấy phép nguồn trước khi xuất bản.',
    'FREE CREATIVE COMMONS VIDEO SEARCH': 'TÌM VIDEO CREATIVE COMMONS MIỄN PHÍ',
    'FREE STOCK VIDEO SEARCH': 'TÌM VIDEO STOCK MIỄN PHÍ',
    'Free stock videos.': 'Video stock miễn phí.',
    'Footage for every project.': 'Video cho mọi dự án.',
    'Skip to prompt builder': 'Đi đến công cụ tạo prompt',
    'All Tools': 'Tất cả công cụ',
    'How It Works': 'Cách hoạt động',
    'Free AI creator tool': 'Công cụ AI miễn phí cho nhà sáng tạo',
    'Free AI tool': 'Công cụ AI miễn phí',
    'Build better AI prompts': 'Tạo prompt AI tốt hơn',
    'in seconds': 'chỉ trong vài giây',
    'Turn a simple idea into a clear, structured prompt for ChatGPT, Claude, Gemini and AI image tools. No account required.': 'Biến ý tưởng đơn giản thành prompt rõ ràng, có cấu trúc cho ChatGPT, Claude, Gemini và công cụ tạo ảnh AI. Không cần tài khoản.',
    'Free to use': 'Sử dụng miễn phí',
    'Works locally': 'Hoạt động cục bộ',
    'PROMPT DETAILS': 'CHI TIẾT PROMPT',
    'Describe what you need': 'Mô tả điều bạn cần',
    'What do you want AI to create?': 'Bạn muốn AI tạo nội dung gì?',
    'Example: Write a YouTube video script about beginner photography tips': 'Ví dụ: Viết kịch bản YouTube về mẹo chụp ảnh cho người mới',
    'AI tool': 'Công cụ AI',
    'Content type': 'Loại nội dung',
    'Target audience': 'Đối tượng mục tiêu',
    'Example: New content creators': 'Ví dụ: Nhà sáng tạo nội dung mới',
    'Tone': 'Giọng điệu',
    'Output language': 'Ngôn ngữ đầu ra',
    'Output length': 'Độ dài đầu ra',
    'Advanced options': 'Tùy chọn nâng cao',
    'Background or context': 'Bối cảnh hoặc thông tin nền',
    'Add facts, brand details or context the AI should know': 'Thêm dữ kiện, thông tin thương hiệu hoặc bối cảnh AI cần biết',
    'Must include': 'Bắt buộc bao gồm',
    'Keywords, examples, sections or calls to action': 'Từ khóa, ví dụ, phần nội dung hoặc lời kêu gọi hành động',
    'Avoid': 'Cần tránh',
    'Topics, phrases, styles or mistakes to avoid': 'Chủ đề, cụm từ, phong cách hoặc lỗi cần tránh',
    'Preferred output format': 'Định dạng đầu ra mong muốn',
    'Example: Markdown with headings and bullet points': 'Ví dụ: Markdown có tiêu đề và danh sách',
    'Generate Prompt': 'Tạo Prompt',
    'GENERATED PROMPT': 'PROMPT ĐÃ TẠO',
    'Your optimized prompt': 'Prompt đã được tối ưu',
    'Your prompt will appear here': 'Prompt của bạn sẽ xuất hiện tại đây',
    'Complete the details and select Generate Prompt.': 'Hoàn tất thông tin và bấm Tạo Prompt.',
    'Generated locally': 'Được tạo trên thiết bị',
    'Copy Prompt': 'Sao chép Prompt',
    'Download TXT': 'Tải file TXT',
    'How to build a better AI prompt': 'Cách tạo prompt AI tốt hơn',
    'Give AI the context it needs to produce a useful first result.': 'Cung cấp đủ bối cảnh để AI tạo kết quả hữu ích ngay từ lần đầu.',
    'Describe the goal': 'Mô tả mục tiêu',
    'Add useful context': 'Thêm bối cảnh hữu ích',
    'Generate and refine': 'Tạo và tinh chỉnh',
    'Why use a structured AI prompt?': 'Tại sao nên dùng prompt AI có cấu trúc?',
    'Clearer instructions': 'Hướng dẫn rõ ràng hơn',
    'Faster results': 'Kết quả nhanh hơn',
    'Works across platforms': 'Hoạt động trên nhiều nền tảng',
    'Is the AI Prompt Builder free?': 'AI Prompt Builder có miễn phí không?',
    'Does CreatorNew send my prompt to an AI service?': 'CreatorNew có gửi prompt của tôi tới dịch vụ AI không?',
    'Does the tool generate AI answers?': 'Công cụ có tạo câu trả lời AI không?',
    'Can I edit the generated prompt?': 'Tôi có thể sửa prompt đã tạo không?',
    'Prompt Builder': 'Công cụ tạo Prompt',
    'Find free videos.': 'Tìm video miễn phí.',
    'Create with confidence.': 'Tự tin sáng tạo.',
    'Search Creative Commons videos from Wikimedia Commons, check license details': 'Tìm video Creative Commons từ Wikimedia Commons và kiểm tra giấy phép',
    'and copy attribution in one click.': 'và sao chép thông tin ghi nguồn chỉ với một lần bấm.',
    'What video are you looking for?': 'Bạn đang tìm video gì?',
    'All Creative Commons licenses': 'Tất cả giấy phép Creative Commons',
    'Commercial use allowed': 'Cho phép sử dụng thương mại',
    'Modifications allowed': 'Cho phép chỉnh sửa',
    'Search videos': 'Tìm video',
    'Searching...': 'Đang tìm...',
    'Original source links': 'Liên kết nguồn gốc',
    'Search content': 'Tìm nội dung',
    'Search in English for the broadest results.': 'Tìm bằng tiếng Anh để nhận được nhiều kết quả nhất.',
    'Preview and verify': 'Xem trước và xác minh',
    'Review the video, creator and license terms directly on each result card.': 'Kiểm tra video, tác giả và điều khoản giấy phép ngay trên từng kết quả.',
    'Attribute correctly': 'Ghi nguồn chính xác',
    'Copy ready-to-use attribution before publishing.': 'Sao chép thông tin ghi nguồn sẵn dùng trước khi xuất bản.',
    'Source: Wikimedia Commons': 'Nguồn: Wikimedia Commons',
    'Unable to load results.': 'Không thể tải kết quả.',
    'No matching videos found': 'Không tìm thấy video phù hợp',
    'Try a broader English keyword or license filter.': 'Hãy thử từ khóa tiếng Anh rộng hơn hoặc bộ lọc giấy phép khác.',
    'Load more videos': 'Tải thêm video',
    'Loading...': 'Đang tải...',
    'View source': 'Xem nguồn',
    'Open source page': 'Mở trang nguồn',
    'License details are provided by uploaders. Always verify the source page before publishing.': 'Thông tin giấy phép do người tải lên cung cấp. Luôn kiểm tra trang nguồn trước khi xuất bản.',
    'Custom dimensions': 'Kích thước tùy chỉnh',
    'Web-ready graphics': 'Ảnh tối ưu cho web',
    'Audio Search': 'Tìm âm thanh',
    'Music & sound effects': 'Nhạc và hiệu ứng âm thanh',
    'Video Search': 'Tìm video',
    'Reusable video clips': 'Video có thể tái sử dụng',
    'Images to PDF': 'Ảnh sang PDF',
    'Combine image pages': 'Ghép các trang ảnh',
    'Private browser processing for supported file tools': 'Các công cụ được hỗ trợ xử lý file riêng tư trên trình duyệt',
    'CreatorNew online toolkit': 'Bộ công cụ online CreatorNew',
    'Free tools for files, media and AI': 'Công cụ miễn phí cho file, media và AI',
    'Edit images and PDFs, discover reusable audio and video, or build AI prompts in one simple online toolkit.': 'Chỉnh sửa ảnh và PDF, tìm âm thanh và video có thể tái sử dụng hoặc tạo prompt AI trong một bộ công cụ online đơn giản.',
    'Most flexible': 'Linh hoạt nhất',
    'Background Remover': 'Xóa nền ảnh',
    'Image Compressor': 'Công cụ nén ảnh',
    'Creative Commons Audio Search': 'Tìm âm thanh Creative Commons',
    'Creative Commons Video Search': 'Tìm video Creative Commons',
    'Built for faster everyday workflows': 'Giúp công việc hằng ngày nhanh hơn',
    'One clean toolkit for everyday image, document, audio and video tasks.': 'Một bộ công cụ gọn gàng cho ảnh, tài liệu, âm thanh và video hằng ngày.',
    'Privacy comes first': 'Ưu tiên quyền riêng tư',
    'Supported image and PDF files are processed locally in your browser instead of on CreatorNew servers.': 'Ảnh và PDF được hỗ trợ sẽ xử lý trực tiếp trên trình duyệt thay vì máy chủ CreatorNew.',
    'Start immediately': 'Bắt đầu ngay lập tức',
    'No account, subscription or setup is required to use the available tools.': 'Không cần tài khoản, đăng ký trả phí hoặc cài đặt.',
    'Useful for any project': 'Hữu ích cho mọi dự án',
    'Responsive tools support school, office, website, social media, video and document tasks.': 'Công cụ tương thích mọi màn hình, hỗ trợ học tập, văn phòng, website, mạng xã hội, video và tài liệu.',
    'Finish your task in three simple steps': 'Hoàn thành công việc trong ba bước đơn giản',
    'Choose a tool': 'Chọn công cụ',
    'Start with the tool that matches the file or media task you need to complete.': 'Chọn công cụ phù hợp với tác vụ file hoặc media bạn cần hoàn thành.',
    'Add a file or search': 'Thêm file hoặc tìm kiếm',
    'Add supported files to the browser workspace or search open media libraries by keyword.': 'Thêm file được hỗ trợ hoặc tìm trong thư viện nội dung mở bằng từ khóa.',
    'Download or create': 'Tải xuống hoặc sáng tạo',
    'Save your result or visit the media source to review its license and attribution.': 'Lưu kết quả hoặc mở nguồn nội dung để kiểm tra giấy phép và ghi nguồn.',
    'Frequently asked questions': 'Câu hỏi thường gặp',
    'Are CreatorNew tools free?': 'Các công cụ CreatorNew có miễn phí không?',
    'Yes. Available CreatorNew tools are free to use without registration or watermarks.': 'Có. Các công cụ CreatorNew hiện có đều miễn phí, không cần đăng ký và không có watermark.',
    'What online tools are available?': 'CreatorNew hiện có những công cụ online nào?',
    'CreatorNew includes image conversion, compression, resizing and background removal; PDF conversion and editing; Creative Commons audio and video search; and an AI prompt builder.': 'CreatorNew có các công cụ chuyển đổi, nén, đổi kích thước và xóa nền ảnh; chuyển đổi và chỉnh sửa PDF; tìm kiếm âm thanh, video Creative Commons; cùng công cụ tạo prompt AI.',
    'Are my files uploaded to a server?': 'File của tôi có được tải lên máy chủ không?',
    'Can I use the audio and video in commercial projects?': 'Tôi có thể dùng âm thanh và video cho dự án thương mại không?',
    'Can I use CreatorNew on mobile?': 'Tôi có thể dùng CreatorNew trên điện thoại không?',
    'Yes. CreatorNew is designed for modern mobile and desktop browsers.': 'Có. CreatorNew được thiết kế cho trình duyệt hiện đại trên điện thoại và máy tính.',
    'Complete your next digital task faster': 'Hoàn thành công việc số tiếp theo nhanh hơn',
    'Choose a free image, PDF, audio, video or AI tool and start without creating an account.': 'Chọn công cụ ảnh, PDF, âm thanh, video hoặc AI miễn phí và bắt đầu không cần tài khoản.',
    '© 2026 CreatorNew. Free online tools for everyone.': '© 2026 CreatorNew. Công cụ online miễn phí cho mọi người.',
    '100% In-Browser & Private Tools': 'Công cụ 100% trên trình duyệt & Riêng tư',
    'Free & private AI tools': 'Công cụ AI miễn phí & riêng tư',
    'for modern creators': 'cho nhà sáng tạo hiện đại',
    'Remove backgrounds and erase objects with local AI, compress images, and edit PDFs directly inside your browser. No server uploads, no watermarks, unlimited free use, and zero registration.': 'Xóa nền và xóa vật thể thừa bằng AI cục bộ, nén ảnh và chỉnh sửa PDF trực tiếp trên trình duyệt. Không tải file lên máy chủ, không watermark, miễn phí không giới hạn và không cần đăng ký.',
    '🔥 Try AI Background Remover': '🔥 Dùng thử AI Xóa Nền & Vật Thể',
    'Compress Images': 'Nén ảnh',
    '🔒 100% In-Browser (No Cloud Uploads)': '🔒 100% Trên trình duyệt (Không tải lên đám mây)',
    '⚡ On-Device AI (WASM)': '⚡ AI chạy cục bộ trên máy (WASM)',
    '✨ Free Forever (No Watermark)': '✨ Miễn phí mãi mãi (Không Watermark)',
    'AI BG & Object Eraser': 'AI Xóa Nền & Vật Thể',
    '100% Private Local AI': 'AI cục bộ riêng tư 100%',
    '🔥 Flagship AI Tool': '🔥 Công cụ AI mũi nhọn',
    'AI Background & Object Remover': 'AI Xóa Nền & Xóa Vật Thể',
    'Remove backgrounds and erase unwanted objects using on-device AI. 100% private, zero cloud uploads, and no watermarks.': 'Tách nền và xóa vật thể thừa bằng AI chạy trên máy. Riêng tư 100%, không tải ảnh lên máy chủ và không có watermark.',
    'Launch AI Studio →': 'Mở công cụ AI →',
    'Open converter →': 'Mở công cụ chuyển đổi →',
    '100% In-Browser · Files are never uploaded': '100% Trên trình duyệt · Không bao giờ tải ảnh lên mạng',
    '💡 Or test instantly with a 1-click sample photo:': '💡 Hoặc thử ngay với ảnh mẫu (chỉ 1 click):',
    'Portrait': 'Chân dung',
    'Hair & edges': 'Tóc & đường viền',
    'Product': 'Sản phẩm',
    'E-commerce shoe': 'Giày bán lẻ',
    'Object Erase': 'Xóa vật thể',
    'Erase sticky note': 'Xóa giấy ghi chú',
    'Side by side': 'Xem song song',
    'Interactive Slider': 'Thanh trượt so sánh',
    '◀ Original': '◀ Ảnh gốc',
    'Result (Transparent) ▶': 'Kết quả (Nền trong suốt) ▶',
    '🔗 Share Tool': '🔗 Chia sẻ công cụ',
    'Tool link copied to clipboard! Share it with your friends.': 'Đã sao chép link công cụ! Hãy chia sẻ với bạn bè.',
    '100% In-Browser AI Tool': 'Công cụ AI 100% trên trình duyệt',
    'Remove backgrounds &': 'Xóa nền &',
    'erase objects privately': 'xóa vật thể riêng tư',
    'Create transparent PNGs or erase unwanted objects with local AI in your browser. Free forever, no watermark, and zero photos uploaded to any server.': 'Tạo ảnh PNG trong suốt hoặc xóa vật thể bằng AI cục bộ trong trình duyệt. Miễn phí mãi mãi, không watermark và không tải bất kỳ ảnh nào lên máy chủ.',
    '100% Private (Runs on Device)': '100% Riêng tư (Chạy trên thiết bị)',
    'Unlimited & Free (No Watermark)': 'Miễn phí & Không giới hạn (Không Watermark)',
    'Zero Server Uploads': 'Không tải lên máy chủ',
    'High-Quality AI Inpainting': 'AI xóa vật thể chất lượng cao'
  }

  const originals = new WeakMap()
  const attributeOriginals = new WeakMap()

  function translateTextNodes(language) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent || parent.closest('script, style, noscript, .language-switcher')) return NodeFilter.FILTER_REJECT
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      }
    })

    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    nodes.forEach((node) => {
      if (!originals.has(node)) originals.set(node, node.nodeValue)
      const original = originals.get(node)
      const key = original.trim()
      if (language === 'vi' && translations[key]) {
        node.nodeValue = original.replace(key, translations[key])
      } else {
        node.nodeValue = original
      }
    })

    document.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
      if (element.closest('.language-switcher')) return
      if (!attributeOriginals.has(element)) attributeOriginals.set(element, {})
      const saved = attributeOriginals.get(element)
      ;['placeholder', 'title', 'aria-label'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return
        if (!(attribute in saved)) saved[attribute] = element.getAttribute(attribute)
        const original = saved[attribute]
        element.setAttribute(attribute, language === 'vi' && translations[original] ? translations[original] : original)
      })
    })
  }

  function applyLanguage(language) {
    document.documentElement.lang = language
    translateTextNodes(language)
    document.querySelectorAll('.language-switcher button').forEach((button) => {
      const active = button.dataset.language === language
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    })
  }

  function createSwitcher() {
    if (!document.getElementById('creatornew-language-styles')) {
      const style = document.createElement('style')
      style.id = 'creatornew-language-styles'
      style.textContent = '.language-switcher{position:fixed;top:88px;right:18px;z-index:10000;display:flex;align-items:center;gap:4px;padding:6px 8px;color:#98a2b3;border:1px solid #dbe1ea;border-radius:10px;background:rgba(255,255,255,.94);box-shadow:0 8px 24px rgba(16,24,40,.1);backdrop-filter:blur(10px)}.language-switcher button{padding:4px 6px;color:#667085;border:0;border-radius:6px;background:transparent;font:700 11px/1.2 Arial,sans-serif;cursor:pointer}.language-switcher button:hover,.language-switcher button.is-active{color:#fff;background:linear-gradient(135deg,#5965f2,#6650dc)}.language-switcher span{font-size:10px}@media(max-width:720px){.language-switcher{top:auto;right:12px;bottom:14px}}'
      document.head.appendChild(style)
    }
    const switcher = document.createElement('div')
    switcher.className = 'language-switcher'
    switcher.setAttribute('aria-label', 'Language selection')
    switcher.innerHTML = '<button type="button" data-language="vi">VI</button><span>/</span><button type="button" data-language="en">EN</button>'
    switcher.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-language]')
      if (!button) return
      localStorage.setItem(STORAGE_KEY, button.dataset.language)
      applyLanguage(button.dataset.language)
    })
    document.body.appendChild(switcher)
  }

  function setupNavDropdowns() {
    function bindDropdown(details) {
      if (details.dataset.dropdownBound) return
      details.dataset.dropdownBound = 'true'
      if (!details.getAttribute('name')) {
        details.setAttribute('name', 'site-nav-dropdown')
      }
      details.addEventListener('toggle', () => {
        if (details.open) {
          document.querySelectorAll('.nav-dropdown[open]').forEach((other) => {
            if (other !== details) {
              other.open = false
            }
          })
        }
      })
    }

    document.querySelectorAll('.nav-dropdown').forEach(bindDropdown)

    if (!window.__creatornewNavDropdownsInitialized) {
      window.__creatornewNavDropdownsInitialized = true

      document.addEventListener('click', (event) => {
        const summary = event.target.closest('.nav-dropdown > summary')
        if (summary) {
          const current = summary.parentElement
          document.querySelectorAll('.nav-dropdown[open]').forEach((other) => {
            if (other !== current) {
              other.open = false
            }
          })
          return
        }

        if (event.target.closest('.nav-dropdown-menu a')) {
          document.querySelectorAll('.nav-dropdown[open]').forEach((d) => {
            d.open = false
          })
          return
        }

        if (!event.target.closest('.nav-dropdown')) {
          document.querySelectorAll('.nav-dropdown[open]').forEach((d) => {
            d.open = false
          })
        }
      })

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          document.querySelectorAll('.nav-dropdown[open]').forEach((d) => {
            d.open = false
          })
        }
      })
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
      })
    }
  }

  function init() {
    createSwitcher()
    setupNavDropdowns()
    registerServiceWorker()
    const saved = localStorage.getItem(STORAGE_KEY)
    const language = saved === 'vi' || saved === 'en' ? saved : (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en'
    applyLanguage(language)
    const observer = new MutationObserver((mutations) => {
      setupNavDropdowns()
      if (!mutations.some((mutation) => mutation.addedNodes.length)) return
      requestAnimationFrame(() => applyLanguage(document.documentElement.lang === 'vi' ? 'vi' : 'en'))
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
