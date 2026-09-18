// Backoffice CRM (W3-14 owns this file from here on).
import { lazy } from 'react';
import type { RouteDef } from './route-types';
import { PERMISSIONS } from '../constants/permissions';

const CrmPortal = lazy(() => import('../pages/backoffice/crm/CrmPortal'));
const CrmCustomersPage = lazy(() => import('../pages/backoffice/crm/CustomersPage'));
const CrmCustomerDetailPage = lazy(() => import('../pages/backoffice/crm/CustomerDetailPage'));
const CrmLeadsPage = lazy(() => import('../pages/backoffice/crm/LeadsPage'));
const CrmLeadDetailPage = lazy(() => import('../pages/backoffice/crm/LeadDetailPage'));
const LeadPipelinePage = lazy(() => import('../pages/backoffice/crm/LeadPipelinePage'));
const CrmPipelineSettingsPage = lazy(() => import('../pages/backoffice/crm/PipelineSettingsPage'));
const CrmSegmentsPage = lazy(() => import('../pages/backoffice/crm/SegmentsPage'));
const CrmCampaignsPage = lazy(() => import('../pages/backoffice/crm/CampaignsPage'));
const CrmCampaignEditorPage = lazy(() => import('../pages/backoffice/crm/CampaignEditorPage'));
const CrmCampaignDetailPage = lazy(() => import('../pages/backoffice/crm/CampaignDetailPage'));
const CrmTasksPage = lazy(() => import('../pages/backoffice/crm/TasksPage'));
const CRMReportsPage = lazy(() => import('../pages/backoffice/crm/CRMReportsPage').then((m) => ({ default: m.CRMReportsPage })));

export const backofficeCrmRoutes: RouteDef[] = [
  { path: 'crm', element: CrmPortal, layout: 'backoffice', group: 'crm', icon: 'LayoutDashboard', title: 'Tổng quan CRM', description: 'Dashboard CRM', permission: PERMISSIONS.CRM_VIEW_CUSTOMERS, name: 'crm' },
  { path: 'crm/customers', element: CrmCustomersPage, layout: 'backoffice', group: 'crm', icon: 'Users', title: 'Khách hàng', description: 'Quản lý khách hàng', permission: PERMISSIONS.CRM_VIEW_CUSTOMERS, name: 'crmCustomers' },
  { path: 'crm/customers/:id', element: CrmCustomerDetailPage, layout: 'backoffice', permission: PERMISSIONS.CRM_VIEW_CUSTOMERS, name: 'crmCustomerDetail' },
  { path: 'crm/leads', element: CrmLeadsPage, layout: 'backoffice', group: 'crm', icon: 'UserPlus', title: 'Leads', description: 'Khách tiềm năng', permission: PERMISSIONS.CRM_VIEW_LEADS, name: 'crmLeads' },
  { path: 'crm/leads/pipeline', element: LeadPipelinePage, layout: 'backoffice', group: 'crm', icon: 'Target', title: 'Pipeline', description: 'Kanban leads', permission: PERMISSIONS.CRM_VIEW_LEADS, name: 'crmLeadsPipeline' },
  { path: 'crm/leads/:id', element: CrmLeadDetailPage, layout: 'backoffice', permission: PERMISSIONS.CRM_VIEW_LEADS, name: 'crmLeadDetail' },
  { path: 'crm/segments', element: CrmSegmentsPage, layout: 'backoffice', group: 'crm', icon: 'ClipboardList', title: 'Phân nhóm', description: 'Phân loại khách hàng', permission: PERMISSIONS.CRM_MANAGE_SEGMENTS, name: 'crmSegments' },
  { path: 'crm/campaigns', element: CrmCampaignsPage, layout: 'backoffice', group: 'crm', icon: 'Mail', title: 'Campaigns', description: 'Email marketing', permission: PERMISSIONS.CRM_MANAGE_CAMPAIGNS, name: 'crmCampaigns' },
  { path: 'crm/campaigns/new', element: CrmCampaignEditorPage, layout: 'backoffice', permission: PERMISSIONS.CRM_MANAGE_CAMPAIGNS, name: 'crmCampaignNew' },
  { path: 'crm/campaigns/:id/edit', element: CrmCampaignEditorPage, layout: 'backoffice', permission: PERMISSIONS.CRM_MANAGE_CAMPAIGNS, name: 'crmCampaignEdit' },
  { path: 'crm/campaigns/:id', element: CrmCampaignDetailPage, layout: 'backoffice', permission: PERMISSIONS.CRM_VIEW_CAMPAIGNS, name: 'crmCampaignDetail' },
  { path: 'crm/tasks', element: CrmTasksPage, layout: 'backoffice', group: 'crm', icon: 'CheckSquare', title: 'Công việc', description: 'Follow-up & nhắc việc', permission: PERMISSIONS.CRM_MANAGE_TASKS, name: 'crmTasks' },
  { path: 'crm/settings/pipeline', element: CrmPipelineSettingsPage, layout: 'backoffice', permission: PERMISSIONS.CRM_MANAGE_LEADS, name: 'crmPipelineSettings' },
  { path: 'crm/reports', element: CRMReportsPage, layout: 'backoffice', hidden: true, permission: PERMISSIONS.CRM_VIEW_ANALYTICS, name: 'crmReports' },
];
