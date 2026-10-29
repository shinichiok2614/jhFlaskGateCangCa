
package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.domain.Employee;
import com.mycompany.myapp.repository.EmployeeRepository;
import com.mycompany.myapp.service.dto.EntryLogDTO;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/entry-logs")
public class EntryLogResource {

    private static final Logger LOG =
        LoggerFactory.getLogger(EntryLogResource.class);

    private static final Pattern PLATE_PATTERN = Pattern.compile(
        "(?i)biển\\s*số\\s*:\\s*([^()\\r\\n]+)"
    );

    private final EmployeeRepository employeeRepository;

    @Value("${app.camera-log.csv-file}")
    private String csvFile;

    public EntryLogResource(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @GetMapping
    public List<EntryLogDTO> getEntryLogs() {
        Path path = Path.of(csvFile).toAbsolutePath().normalize();

        if (!Files.isRegularFile(path) || !Files.isReadable(path)) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không đọc được file CSV camera"
            );
        }

        // Tạo bảng tra cứu biển số -> nhân viên.
        Map<String, Employee> employeeByPlate = new HashMap<>();

        for (Employee employee : employeeRepository.findAll()) {
            String key = normalizePlate(employee.getLicensePlate());

            if (!key.isEmpty()) {
                // Nếu dữ liệu có biển số trùng nhau, không tự chọn
                // một người để tránh gán sai chủ xe.
                if (employeeByPlate.containsKey(key)) {
                    employeeByPlate.put(key, null);
                } else {
                    employeeByPlate.put(key, employee);
                }
            }
        }

        List<EntryLogDTO> result = new ArrayList<>();

        try (CSVReader reader = new CSVReader(
            Files.newBufferedReader(path, StandardCharsets.UTF_8)
        )) {
            String[] header = reader.readNext();

            if (header == null) {
                return result;
            }

            Map<String, Integer> columns = new HashMap<>();

            for (int i = 0; i < header.length; i++) {
                String name = header[i] == null ? "" : header[i].trim();
                name = name.replace("\uFEFF", "");
                columns.put(name, i);
            }

            String[] row;

            while ((row = reader.readNext()) != null) {
                String time = get(row, columns, "thoi_gian");
                Integer frameCount = parseInteger(
                    get(row, columns, "so_khung_da_chup")
                );

                
                addEvent(
                    result, employeeByPlate, time, frameCount,
                    "Xe máy",
                    get(row, columns, "moto_plate_anh_goc"),
                    get(row, columns, "moto_plate_anh_nhan_dien"),
                    get(row, columns, "moto_face_anh_nhan_dien"),
                    get(row, columns, "moto_plate_ket_qua")
                );

                addEvent(
                    result, employeeByPlate, time, frameCount,
                    "Ô tô",
                    get(row, columns, "car_plate_anh_goc"),
                    get(row, columns, "car_plate_anh_nhan_dien"),
                    get(row, columns, "car_face_anh_nhan_dien"),
                    get(row, columns, "car_plate_ket_qua")
                );

            }

            return result;
        } catch (IOException | CsvValidationException e) {
            LOG.error("Lỗi đọc nhật ký camera", e);

            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể đọc nhật ký camera"
            );
        }
    }

        
    private void addEvent(
        List<EntryLogDTO> result,
        Map<String, Employee> employeeByPlate,
        String time,
        Integer frameCount,
        String vehicleType,
        String originalImage,
        String recognizedImage,
        String faceImage,
        String recognitionResult
    ) {
        String plate = extractPlate(recognitionResult);

        if (plate.isEmpty()) {
            return;
        }

        String key = normalizePlate(plate);
        Employee employee = employeeByPlate.get(key);
        boolean registered = employee != null;

        result.add(new EntryLogDTO(
            time,
            frameCount,
            vehicleType,
            plate,
            originalImage,
            recognizedImage,
            faceImage,
            recognitionResult,
            registered ? employee.getEmployeeCode() : null,
            registered ? employee.getFullName() : null,
            registered ? employee.getDepartment() : null,
            registered ? employee.getPosition() : null,
            registered ? "Nhân viên" : "Khách ngoài"
        ));
    }


    private String extractPlate(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        Matcher matcher = PLATE_PATTERN.matcher(text);

        if (!matcher.find()) {
            return "";
        }

        return matcher.group(1).trim();
    }

    private String normalizePlate(String plate) {
        if (plate == null) {
            return "";
        }

        return plate
            .toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]", "");
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

        return value == null || value.isBlank()
            ? null
            : value.trim();
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
