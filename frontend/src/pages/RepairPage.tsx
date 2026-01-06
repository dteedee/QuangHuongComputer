import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi, type WorkOrder } from '../api/repair';

export const RepairPage = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [deviceModel, setDeviceModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [success, setSuccess] = useState(false);

    const { data: repairs, isLoading } = useQuery<WorkOrder[]>({
        queryKey: ['repairs'],
        queryFn: repairApi.getMyWorkOrders,
        enabled: isAuthenticated
    });

    const createRepair = useMutation({
        mutationFn: (data: { deviceModel: string, serialNumber: string, description: string }) =>
            repairApi.createWorkOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            setSuccess(true);
            setDeviceModel('');
            setSerialNumber('');
            setIssueDescription('');
            setTimeout(() => setSuccess(false), 3000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createRepair.mutate({ deviceModel, serialNumber, description: issueDescription });
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Please sign in to book a repair</h2>
                <p className="text-gray-400 mb-6">You need an account to track your repair status and history.</p>
                <Link to="/login" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Sign In to Continue
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h2 className="text-3xl font-bold text-white mb-8">Repair Services</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Booking Form */}
                <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-white/10 h-fit">
                    <h3 className="text-xl font-semibold text-blue-400 mb-6">Book a Repair</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Device Model</label>
                            <input
                                value={deviceModel}
                                onChange={e => setDeviceModel(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Dell XPS 15"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                            <input
                                value={serialNumber}
                                onChange={e => setSerialNumber(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. SN123456"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Describe the Issue</label>
                            <textarea
                                value={issueDescription}
                                onChange={e => setIssueDescription(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                placeholder="What's wrong with your device?"
                                required
                            />
                        </div>
                        {success && <p className="text-green-400 text-sm">Repair booked successfully!</p>}
                        <button
                            type="submit"
                            disabled={createRepair.isPending}
                            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {createRepair.isPending ? 'Booking...' : 'Submit Request'}
                        </button>
                    </form>
                </div>

                {/* Repair Status */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-semibold text-white mb-6">Your Repair History</h3>
                    {isLoading ? (
                        <div className="text-center text-gray-400">Loading repairs...</div>
                    ) : repairs?.length === 0 ? (
                        <div className="bg-white/5 p-8 rounded-xl border border-white/10 text-center text-gray-500">
                            No repairs found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {repairs?.map(repair => (
                                <div key={repair.id} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-white/20 transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{repair.deviceModel}</h4>
                                            <p className="text-sm text-gray-400">SN: {repair.serialNumber}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${repair.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                                repair.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {repair.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mb-4">{repair.description}</p>
                                    <div className="flex justify-between text-sm text-gray-400 border-t border-white/10 pt-4">
                                        <span>Booked: {new Date(repair.createdAt).toLocaleDateString()}</span>
                                        {repair.estimatedCost > 0 && (
                                            <span className="text-indigo-400">Estimate: ${repair.estimatedCost}</span>
                                        )}
                                    </div>
                                    {repair.technicalNotes && (
                                        <div className="mt-4 p-3 bg-blue-500/10 rounded text-sm text-blue-200">
                                            <strong>Technician Notes:</strong> {repair.technicalNotes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

