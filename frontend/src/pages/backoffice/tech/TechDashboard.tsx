import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { repairApi, WorkOrder, WorkOrderStatus, getStatusColor } from '../../../api/repair';
import { useAuth } from '../../../context/AuthContext';

export const TechDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'myJobs' | 'unassigned'>('myJobs');
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [unassigned, setUnassigned] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isManager = user?.roles?.includes('Manager') || user?.roles?.includes('Admin');

    useEffect(() => {
        loadWorkOrders();
    }, [activeTab]);

    const loadWorkOrders = async () => {
        try {
            setLoading(true);
            setError('');

            if (activeTab === 'myJobs') {
                const response = await repairApi.technician.getMyWorkOrders();
                setWorkOrders(response.workOrders);
            } else if (activeTab === 'unassigned' && isManager) {
                const data = await repairApi.technician.getUnassignedWorkOrders();
                setUnassigned(data);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load work orders');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await repairApi.technician.acceptAssignment(id);
            loadWorkOrders();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to accept assignment');
        }
    };

    const handleDecline = async (id: string) => {
        const reason = prompt('Reason for declining:');
        if (!reason) return;

        try {
            await repairApi.technician.declineAssignment(id, reason);
            loadWorkOrders();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to decline assignment');
        }
    };

    const getQuickStats = () => {
        const assignedToMe = workOrders.filter(w => w.status === 'Assigned').length;
        const inProgress = workOrders.filter(w => w.status === 'InProgress').length;
        const completedToday = workOrders.filter(w => {
            if (w.status !== 'Completed' || !w.finishedAt) return false;
            const today = new Date().toDateString();
            return new Date(w.finishedAt).toDateString() === today;
        }).length;

        return { assignedToMe, inProgress, completedToday };
    };

    const stats = getQuickStats();

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Technician Dashboard</h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Assigned to Me</div>
                    <div className="text-3xl font-bold text-blue-600">{stats.assignedToMe}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">In Progress</div>
                    <div className="text-3xl font-bold text-green-600">{stats.inProgress}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Completed Today</div>
                    <div className="text-3xl font-bold text-purple-600">{stats.completedToday}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b flex">
                    <button
                        onClick={() => setActiveTab('myJobs')}
                        className={`px-6 py-3 font-medium ${
                            activeTab === 'myJobs'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        My Jobs
                    </button>
                    {isManager && (
                        <button
                            onClick={() => setActiveTab('unassigned')}
                            className={`px-6 py-3 font-medium ${
                                activeTab === 'unassigned'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Unassigned Jobs
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : activeTab === 'myJobs' ? (
                        <WorkOrdersList
                            workOrders={workOrders}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            showActions={true}
                        />
                    ) : (
                        <WorkOrdersList
                            workOrders={unassigned}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            showActions={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

interface WorkOrdersListProps {
    workOrders: WorkOrder[];
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
    showActions: boolean;
}

const WorkOrdersList: React.FC<WorkOrdersListProps> = ({ workOrders, onAccept, onDecline, showActions }) => {
    if (workOrders.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No work orders found
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {workOrders.map(wo => (
                <div key={wo.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <Link
                                to={`/backoffice/tech/work-orders/${wo.id}`}
                                className="text-lg font-semibold text-blue-600 hover:underline"
                            >
                                {wo.ticketNumber}
                            </Link>
                            <div className="text-sm text-gray-600 mt-1">{wo.deviceModel}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                            {wo.status}
                        </span>
                    </div>

                    <div className="text-sm text-gray-700 mb-3">
                        {wo.description.substring(0, 150)}
                        {wo.description.length > 150 && '...'}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="space-y-1">
                            {wo.serviceType && (
                                <div>
                                    <span className="font-medium">Type:</span> {wo.serviceType}
                                    {wo.serviceAddress && ` - ${wo.serviceAddress}`}
                                </div>
                            )}
                            <div>
                                <span className="font-medium">Created:</span>{' '}
                                {new Date(wo.createdAt).toLocaleString()}
                            </div>
                            {wo.assignedAt && (
                                <div>
                                    <span className="font-medium">Assigned:</span>{' '}
                                    {new Date(wo.assignedAt).toLocaleString()}
                                </div>
                            )}
                        </div>

                        {showActions && wo.status === 'Assigned' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onAccept(wo.id)}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => onDecline(wo.id)}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                >
                                    Decline
                                </button>
                            </div>
                        )}

                        {showActions && wo.status !== 'Assigned' && wo.status !== 'Completed' && (
                            <Link
                                to={`/backoffice/tech/work-orders/${wo.id}`}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                View Details
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TechDashboard;
