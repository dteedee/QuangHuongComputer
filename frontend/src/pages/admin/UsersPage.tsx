import { useState } from 'react';
import { UserPlus, Mail, Shield, Search } from 'lucide-react';

export const AdminUsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');

    // Mock data - replace with actual API call
    const users = [
        { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', role: 'Customer', orders: 12, joined: '2024-01-15' },
        { id: '2', name: 'Trần Thị B', email: 'tranthib@example.com', role: 'Customer', orders: 8, joined: '2024-03-20' },
        { id: '3', name: 'Lê Văn C', email: 'levanc@example.com', role: 'Technician', orders: 0, joined: '2024-02-10' },
        { id: '4', name: 'Phạm Thị D', email: 'phamthid@example.com', role: 'Admin', orders: 0, joined: '2023-12-01' },
        { id: '5', name: 'Hoàng Văn E', email: 'hoangvane@example.com', role: 'Customer', orders: 25, joined: '2023-11-05' },
    ];

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'Admin': return 'bg-red-500/20 text-red-400';
            case 'Technician': return 'bg-purple-500/20 text-purple-400';
            case 'Customer': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
                    <p className="text-gray-400">Manage user accounts and permissions</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                    <UserPlus size={20} />
                    Add User
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Orders</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Joined</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="border-t border-white/10 hover:bg-white/5 transition">
                                <td className="px-6 py-4 text-white font-medium">{user.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Mail size={16} className="text-gray-400" />
                                        {user.email}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-300">{user.orders}</td>
                                <td className="px-6 py-4 text-gray-300">{user.joined}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end">
                                        <button className="flex items-center gap-2 px-3 py-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition">
                                            <Shield size={18} />
                                            Manage
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
