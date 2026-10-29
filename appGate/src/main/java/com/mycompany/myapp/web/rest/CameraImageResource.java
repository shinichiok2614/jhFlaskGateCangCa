
package com.mycompany.myapp.web.rest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaTypeFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/camera-images")
public class CameraImageResource {

    @Value("${app.camera-log.image-root}")
    private String imageRoot;

    @GetMapping
    public ResponseEntity<Resource> getImage(@RequestParam String path) {
        try {
            Path root = Path.of(imageRoot).toAbsolutePath().normalize();

            if (!Files.isDirectory(root)) {
                throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Thư mục ảnh chưa tồn tại"
                );
            }

            Path relative = Path.of(path);

            if (relative.isAbsolute()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đường dẫn ảnh không hợp lệ"
                );
            }

            // Path candidate = root.resolve(relative).normalize();

            // CSV lưu đường dẫn bắt đầu bằng captures/,
            // trong khi image-root đã trỏ thẳng vào thư mục captures.
            Path relativePath = relative;

            if (relativePath.getNameCount() > 0
                && relativePath.getName(0).toString().equals("captures")) {
                relativePath = relativePath.subpath(1, relativePath.getNameCount());
            }

            Path candidate = root.resolve(relativePath).normalize();

            if (!candidate.startsWith(root) ||
                !Files.isRegularFile(candidate) ||
                !Files.isReadable(candidate)) {
                throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy ảnh"
                );
            }

            // Kiểm tra cả đường dẫn thực tế để tránh đi ra ngoài thư mục
            // thông qua symbolic link.
            Path realRoot = root.toRealPath();
            Path realFile = candidate.toRealPath();

            if (!realFile.startsWith(realRoot)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đường dẫn ảnh không hợp lệ"
                );
            }

            String contentType = Files.probeContentType(realFile);

            if (contentType == null) {
                contentType = MediaTypeFactory
                    .getMediaType(realFile.getFileName().toString())
                    .map(MediaType::toString)
                    .orElse("");
            }

            if (!"image/jpeg".equalsIgnoreCase(contentType) &&
                !"image/png".equalsIgnoreCase(contentType) &&
                !"image/webp".equalsIgnoreCase(contentType)) {
                throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP"
                );
            }

            Resource resource = new FileSystemResource(realFile);

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);

        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể đọc ảnh"
            );
        }
    }
}
