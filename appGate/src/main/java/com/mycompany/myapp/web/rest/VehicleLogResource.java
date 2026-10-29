
package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.service.dto.CameraLogDTO;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/vehicle-logs")
public class VehicleLogResource {

    private static final Logger LOG =
        LoggerFactory.getLogger(VehicleLogResource.class);

    @Value("${app.camera-log.csv-file}")
    private String csvFile;

    @GetMapping
    public List<CameraLogDTO> getVehicleLogs() {
        Path path = Path.of(csvFile).toAbsolutePath().normalize();

        if (!Files.isRegularFile(path) || !Files.isReadable(path)) {
            LOG.error("Không tìm thấy hoặc không đọc được CSV: {}", path);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không đọc được file CSV cấu hình"
            );
        }

        List<CameraLogDTO> logs = new ArrayList<>();

        try (CSVReader reader = new CSVReader(
            Files.newBufferedReader(path, StandardCharsets.UTF_8)
        )) {
            String[] header = reader.readNext();

            if (header == null) {
                return logs;
            }

            Map<String, Integer> columns = new HashMap<>();
            for (int i = 0; i < header.length; i++) {
                String name = header[i] == null ? "" : header[i].trim();

                // Xử lý BOM UTF-8 nếu có ở đầu file CSV.
                name = name.replace("\uFEFF", "");
                columns.put(name, i);
            }

            String[] row;
            while ((row = reader.readNext()) != null) {
                logs.add(new CameraLogDTO(
                    get(row, columns, "thoi_gian"),
                    parseInteger(get(row, columns, "so_khung_da_chup")),

                    get(row, columns, "moto_face_anh_goc"),
                    get(row, columns, "moto_face_anh_nhan_dien"),
                    get(row, columns, "moto_face_ket_qua"),

                    get(row, columns, "car_face_anh_goc"),
                    get(row, columns, "car_face_anh_nhan_dien"),
                    get(row, columns, "car_face_ket_qua"),

                    get(row, columns, "moto_plate_anh_goc"),
                    get(row, columns, "moto_plate_anh_nhan_dien"),
                    get(row, columns, "moto_plate_ket_qua"),

                    get(row, columns, "car_plate_anh_goc"),
                    get(row, columns, "car_plate_anh_nhan_dien"),
                    get(row, columns, "car_plate_ket_qua")
                ));
            }

            return logs;
        } catch (IOException | CsvValidationException e) {
            LOG.error("Lỗi đọc CSV camera", e);
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Có lỗi khi đọc file CSV camera"
            );
        }
    }

    private String get(
        String[] row,
        Map<String, Integer> columns,
        String name
    ) {
        Integer index = columns.get(name);

        if (index == null || index < 0 || index >= row.length) {
            return null;
        }

        String value = row[index];
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Integer parseInteger(String value) {
        if (value == null) {
            return null;
        }

        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
