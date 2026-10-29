import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Row, Col } from 'reactstrap';
import { Translate } from 'react-jhipster';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useAppDispatch, useAppSelector } from 'app/config/store';

import { getEntity } from './employee.reducer';

export const EmployeeDetail = () => {
  const dispatch = useAppDispatch();

  const { id } = useParams<'id'>();

  useEffect(() => {
    dispatch(getEntity(id));
  }, []);

  const employeeEntity = useAppSelector(state => state.employee.entity);
  return (
    <Row>
      <Col md="8">
        <h2 data-cy="employeeDetailsHeading">
          <Translate contentKey="appGateApp.employee.detail.title">Employee</Translate>
        </h2>
        <dl className="jh-entity-details">
          <dt>
            <span id="id">
              <Translate contentKey="global.field.id">ID</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.id}</dd>
          <dt>
            <span id="employeeCode">
              <Translate contentKey="appGateApp.employee.employeeCode">Employee Code</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.employeeCode}</dd>
          <dt>
            <span id="fullName">
              <Translate contentKey="appGateApp.employee.fullName">Full Name</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.fullName}</dd>
          <dt>
            <span id="position">
              <Translate contentKey="appGateApp.employee.position">Position</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.position}</dd>
          <dt>
            <span id="department">
              <Translate contentKey="appGateApp.employee.department">Department</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.department}</dd>
          <dt>
            <span id="phone">
              <Translate contentKey="appGateApp.employee.phone">Phone</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.phone}</dd>
          <dt>
            <span id="email">
              <Translate contentKey="appGateApp.employee.email">Email</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.email}</dd>
          <dt>
            <span id="licensePlate">
              <Translate contentKey="appGateApp.employee.licensePlate">License Plate</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.licensePlate}</dd>
          <dt>
            <span id="faceImagePath">
              <Translate contentKey="appGateApp.employee.faceImagePath">Face Image Path</Translate>
            </span>
          </dt>
          <dd>{employeeEntity.faceImagePath}</dd>
        </dl>
        <Button tag={Link} to="/employee" replace color="info" data-cy="entityDetailsBackButton">
          <FontAwesomeIcon icon="arrow-left" />{' '}
          <span className="d-none d-md-inline">
            <Translate contentKey="entity.action.back">Back</Translate>
          </span>
        </Button>
        &nbsp;
        <Button tag={Link} to={`/employee/${employeeEntity.id}/edit`} replace color="primary">
          <FontAwesomeIcon icon="pencil-alt" />{' '}
          <span className="d-none d-md-inline">
            <Translate contentKey="entity.action.edit">Edit</Translate>
          </span>
        </Button>
      </Col>
    </Row>
  );
};

export default EmployeeDetail;
