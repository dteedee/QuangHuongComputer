import { useState, useEffect } from 'react';
import {
    Users2, CreditCard, Calendar, BarChart,
    UserPlus, Search, Download, CheckCircle
} from 'lucide-react';
import { hrApi } from '../../../api/hr';
import type { Employee, Payroll } from '../../../api/hr';

export const HRPortal = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [empData, payData] = await Promise.all([
                    hrApi.getEmployees(),
                    hrApi.getPayroll()
                ]);
                setEmployees(empData);
                setPayrolls(payData);
            } catch (error) {
                console.error('Failed to fetch HR data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Human Resources</h1>
                    <p className="text-slate-400 mt-1">Manage workforce and payroll processing.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all active:scale-95">
                        <Download size={20} />
                        Export Data
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                        <UserPlus size={20} />
                        Add Employee
                    </button>
                </div>
            </div>

            {/* HR Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Staff', value: employees.length, icon: <Users2 className="text-blue-400" /> },
                    { label: 'Pending Payroll', value: '4', icon: <CreditCard className="text-amber-400" /> },
                    { label: 'On Leave', value: '2', icon: <Calendar className="text-purple-400" /> },
                    { label: 'Performance', value: '94%', icon: <BarChart className="text-emerald-400" /> },
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
                        <div className="p-3 bg-slate-800 rounded-2xl w-fit mb-4">{stat.icon}</div>
                        <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Employee Directory */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Employee Directory</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {employees.map((emp) => (
                            <div key={emp.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white">
                                        {emp.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{emp.fullName}</h4>
                                        <p className="text-xs text-slate-500">{emp.position} • {emp.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-white">${emp.baseSalary.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Base Salary</p>
                                    </div>
                                    <button className="p-2 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                        <Calendar size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payroll Management */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Latest Payrolls</h3>
                        <button className="text-sm font-bold text-blue-400 hover:underline">Process Monthly</button>
                    </div>
                    <div className="space-y-4 flex-1">
                        {payrolls.map((pay) => (
                            <div key={pay.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${pay.isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <CheckCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{pay.employeeName || 'Staff Member'}</p>
                                        <p className="text-xs text-slate-500">Period: {pay.month}/{pay.year}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">${pay.amount.toLocaleString()}</p>
                                    <p className={`text-[10px] font-bold uppercase ${pay.isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {pay.isPaid ? 'Paid' : 'Pending'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                        <h4 className="text-blue-400 font-bold mb-1">Payroll Cycle</h4>
                        <p className="text-slate-400 text-sm mb-4">The next payroll generation is scheduled for the end of the month.</p>
                        <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
                            Generate Reports
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

