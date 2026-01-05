
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warrantyApi, type WarrantyClaim, type WarrantyCoverage } from '../api/warranty';

export const WarrantyPage = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [serialNumber, setSerialNumber] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [success, setSuccess] = useState(false);
    const [lookupSerial, setLookupSerial] = useState('');
    const [coverageInfo, setCoverageInfo] = useState<WarrantyCoverage | null>(null);

    const { data: claims, isLoading } = useQuery<WarrantyClaim[]>({
        queryKey: ['warranty-claims'],
        queryFn: warrantyApi.getMyClaims,
        enabled: isAuthenticated
    });

    const createClaim = useMutation({
        mutationFn: warrantyApi.createClaim,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
            setSuccess(true);
            setSerialNumber('');
            setIssueDescription('');
            setTimeout(() => setSuccess(false), 3000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createClaim.mutate({ serialNumber, issueDescription });
    };

    const handleLookup = async () => {
        if (!lookupSerial) return;
        try {
            const data = await warrantyApi.lookupCoverage(lookupSerial);
            setCoverageInfo(data);
        } catch (error) {
            setCoverageInfo({ serialNumber: lookupSerial, productId: '', status: 'Error', expirationDate: '', isValid: false, error: 'Serial number not found' });
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Please sign in to access warranty services</h2>
                <p className="text-gray-400">You need an account to file claims and check warranty coverage.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <h2 className="text-3xl font-bold text-white mb-8">Warranty Services</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coverage Lookup */}
                <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-white/10 h-fit">
                    <h3 className="text-xl font-semibold text-green-400 mb-6">Check Coverage</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                            <input
                                value={lookupSerial}
                                onChange={e => setLookupSerial(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g. SN123456"
                            />
                        </div>
                        <button
                            onClick={handleLookup}
                            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                            Check Status
                        </button>
                        {coverageInfo && (
                            <div className="mt-4 p-4 bg-white/10 rounded-lg">
                                {coverageInfo.error ? (
                                    <p className="text-red-400">{coverageInfo.error}</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-300">Serial: {coverageInfo.serialNumber}</p>
                                        <p className="text-sm text-gray-300">Status: <span className="text-green-400">{coverageInfo.status}</span></p>
                                        <p className="text-sm text-gray-300">Expires: {new Date(coverageInfo.expirationDate).toLocaleDateString()}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* File Claim */}
                <div className="bg-white/5 backdrop-blur-lg p-6 rounded-xl border border-white/10 h-fit">
                    <h3 className="text-xl font-semibold text-orange-400 mb-6">File a Claim</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Serial Number</label>
                            <input
                                value={serialNumber}
                                onChange={e => setSerialNumber(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="e.g. SN123456"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Issue Description</label>
                            <textarea
                                value={issueDescription}
                                onChange={e => setIssueDescription(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                                placeholder="Describe the issue with your product"
                                required
                            />
                        </div>
                        {success && <p className="text-green-400 text-sm">Claim filed successfully!</p>}
                        <button
                            type="submit"
                            disabled={createClaim.isPending}
                            className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                        >
                            {createClaim.isPending ? 'Filing...' : 'Submit Claim'}
                        </button>
                    </form>
                </div>

                {/* Claims History */}
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-semibold text-white mb-6">Your Claims</h3>
                    {isLoading ? (
                        <div className="text-center text-gray-400">Loading claims...</div>
                    ) : claims?.length === 0 ? (
                        <div className="bg-white/5 p-8 rounded-xl border border-white/10 text-center text-gray-500">
                            No claims found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {claims?.map(claim => (
                                <div key={claim.id} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-white/20 transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-white">SN: {claim.serialNumber}</h4>
                                            <p className="text-sm text-gray-400">Filed: {new Date(claim.filedDate).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${claim.status === 'Resolved' ? 'bg-green-500/20 text-green-400' :
                                            claim.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                                                claim.status === 'Approved' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {claim.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mb-4">{claim.issueDescription}</p>
                                    {claim.resolutionNotes && (
                                        <div className="mt-4 p-3 bg-blue-500/10 rounded text-sm text-blue-200">
                                            <strong>Resolution:</strong> {claim.resolutionNotes}
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
