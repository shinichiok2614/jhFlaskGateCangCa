
package com.mycompany.myapp.service.dto;

public record CameraLogDTO(
    String thoiGian,
    Integer soKhungDaChup,

    String motoFaceAnhGoc,
    String motoFaceAnhNhanDien,
    String motoFaceKetQua,

    String carFaceAnhGoc,
    String carFaceAnhNhanDien,
    String carFaceKetQua,

    String motoPlateAnhGoc,
    String motoPlateAnhNhanDien,
    String motoPlateKetQua,

    String carPlateAnhGoc,
    String carPlateAnhNhanDien,
    String carPlateKetQua
) {}
