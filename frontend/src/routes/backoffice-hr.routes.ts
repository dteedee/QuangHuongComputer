// Backoffice HR + payroll (W3-6 owns this file from here on).
//
// `hr/chat` (InternalChatPage) is gone on purpose — mock-data page, delete-only ownership
// (phase-17 Related Code Files: `pages/backoffice/hr/internal-chat-page.tsx`), not migrated.
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const HRPortal = lazy(() => import('../pages/backoffice/hr/HRPortal').then((m) => ({ default: m.HRPortal })));
const EmployeesPage = lazy(() => import('../pages/backoffice/hr/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const RecruitmentManagement = lazy(() => import('../pages/backoffice/hr/RecruitmentManagement').then((m) => ({ default: m.RecruitmentManagement })));
const AttendancePage = lazy(() => import('../pages/backoffice/hr/attendance-page'));
const LeaveApprovalPage = lazy(() => import('../pages/backoffice/hr/leave-approval-page'));
const OvertimeApprovalPage = lazy(() => import('../pages/backoffice/hr/overtime-approval-page'));
const EmployeeSelfServicePage = lazy(() => import('../pages/backoffice/hr/employee-self-service-page'));
const HRReportsPage = lazy(() => import('../pages/backoffice/hr/HRReportsPage').then((m) => ({ default: m.HRReportsPage })));
const HrContractsPage = lazy(() => import('../pages/backoffice/hr/contracts-page'));
const AttendanceRulesPage = lazy(() => import('../pages/backoffice/hr/attendance-rules-page'));
const EmployeeAssetsPage = lazy(() => import('../pages/backoffice/hr/employee-assets-page'));
const PayrollRunPage = lazy(() => import('../pages/backoffice/hr/payroll-run-page'));
const PayrollDetailPage = lazy(() => import('../pages/backoffice/hr/payroll-detail-page'));
const SalaryStructurePage = lazy(() => import('../pages/backoffice/hr/salary-structure-page'));
const PitFinalizationPage = lazy(() => import('../pages/backoffice/hr/pit-finalization-page'));
const StatutoryParametersPage = lazy(() => import('../pages/backoffice/hr/statutory-parameters-page'));
const CommissionsPage = lazy(() => import('../pages/backoffice/hr/commissions-page'));

export const backofficeHrRoutes: RouteDef[] = [
  { path: 'hr', element: HRPortal, layout: 'backoffice', group: 'finance_hr', icon: 'Briefcase', title: 'Nhân sự', description: 'Quản lý nhân sự', permission: PERMISSIONS.HR_VIEW_EMPLOYEES, name: 'hr' },
  { path: 'hr/employees', element: EmployeesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_EMPLOYEES, name: 'hrEmployees' },
  { path: 'hr/recruitment', element: RecruitmentManagement, layout: 'backoffice', group: 'finance_hr', icon: 'UserCheck', title: 'Tuyển dụng', description: 'Tuyển dụng nhân viên', permission: PERMISSIONS.HR_MANAGE_EMPLOYEES, name: 'hrRecruitment' },
  { path: 'hr/attendance', element: AttendancePage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_ATTENDANCE, name: 'hrAttendance' },
  { path: 'hr/approvals', element: LeaveApprovalPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_APPROVE_LEAVE, name: 'hrLeaveApprovals' },
  { path: 'hr/overtime-approval', element: OvertimeApprovalPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_APPROVE_LEAVE, name: 'hrOvertimeApproval' },
  { path: 'hr/self-service', element: EmployeeSelfServicePage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_VIEW_EMPLOYEES, name: 'hrSelfService' },
  { path: 'hr/reports', element: HRReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.REPORTING_VIEW_HR, name: 'hrReports' },
  { path: 'hr/contracts', element: HrContractsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_EMPLOYEES, name: 'hrContracts' },
  { path: 'hr/attendance-rules', element: AttendanceRulesPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_ATTENDANCE, name: 'hrAttendanceRules' },
  { path: 'hr/employee-assets', element: EmployeeAssetsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_EMPLOYEES, name: 'hrEmployeeAssets' },
  // Payroll: this track aligns to the W1-1 catalog's `HR.ManagePayroll` (Admin,Manager,Accountant,HR)
  // — WIDER than the old ad-hoc `['Admin','HR']` FE gate. Backend authorization is unchanged either
  // way (client gating is UX only); trusting the catalog here because it IS this wave's target
  // contract, not a guess. PIT finalization (tax filing, most sensitive) keeps the narrow old gate.
  { path: 'hr/payroll-runs', element: PayrollRunPage, layout: 'backoffice', group: 'finance_hr', icon: 'Wallet', title: 'Chạy lương', description: 'Kỳ lương & bảng lương', permission: PERMISSIONS.HR_MANAGE_PAYROLL, name: 'hrPayrollRuns' },
  { path: 'hr/payroll/:payrollId', element: PayrollDetailPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_PAYROLL, name: 'hrPayrollDetail' },
  // Hoa hồng kỹ thuật (docs/api-contracts/hr-commission.md): đọc HR.ViewPayroll; đối soát/duyệt/huỷ
  // gated lại bằng HR.ManagePayroll trong trang.
  { path: 'hr/commissions', element: CommissionsPage, layout: 'backoffice', group: 'finance_hr', icon: 'BadgePercent', title: 'Hoa hồng kỹ thuật', description: 'Hoa hồng phiếu sửa theo kỳ, duyệt và trả qua lương', permission: PERMISSIONS.HR_VIEW_PAYROLL, name: 'hrCommissions' },
  { path: 'hr/salary-structures', element: SalaryStructurePage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.HR_MANAGE_PAYROLL, name: 'hrSalaryStructures' },
  { path: 'hr/pit-finalization', element: PitFinalizationPage, layout: 'backoffice', hidden: true, allowedRoles: ['Admin', 'HR'], name: 'hrPitFinalization' },
  // D06 (+4h, binding): tham số lương/thuế/BH theo mốc hiệu lực. Đọc: HR.ViewPayroll (HR xem
  // được); ghi (thêm mốc mới) gated lại bởi <Can permission={HR_MANAGE_STATUTORY_PARAMETERS}>
  // trong trang — chỉ Admin/Accountant có quyền đó theo docs/api-contracts/hr-statutory.md §5.
  { path: 'hr/statutory-parameters', element: StatutoryParametersPage, layout: 'backoffice', group: 'finance_hr', icon: 'Calculator', title: 'Tham số lương/thuế/BH', description: 'Mốc hiệu lực pháp luật lương - thuế TNCN - bảo hiểm', permission: PERMISSIONS.HR_VIEW_PAYROLL, name: 'hrStatutoryParameters' },
];
