package com.mycompany.myapp.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

public class EmployeeTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    public static Employee getEmployeeSample1() {
        return new Employee()
            .id(1L)
            .employeeCode("employeeCode1")
            .fullName("fullName1")
            .position("position1")
            .department("department1")
            .phone("phone1")
            .email("email1")
            .licensePlate("licensePlate1")
            .faceImagePath("faceImagePath1");
    }

    public static Employee getEmployeeSample2() {
        return new Employee()
            .id(2L)
            .employeeCode("employeeCode2")
            .fullName("fullName2")
            .position("position2")
            .department("department2")
            .phone("phone2")
            .email("email2")
            .licensePlate("licensePlate2")
            .faceImagePath("faceImagePath2");
    }

    public static Employee getEmployeeRandomSampleGenerator() {
        return new Employee()
            .id(longCount.incrementAndGet())
            .employeeCode(UUID.randomUUID().toString())
            .fullName(UUID.randomUUID().toString())
            .position(UUID.randomUUID().toString())
            .department(UUID.randomUUID().toString())
            .phone(UUID.randomUUID().toString())
            .email(UUID.randomUUID().toString())
            .licensePlate(UUID.randomUUID().toString())
            .faceImagePath(UUID.randomUUID().toString());
    }
}
