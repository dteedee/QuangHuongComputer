// Định nghĩa và dịch các quyền hạn trong hệ thống

export interface PermissionInfo {
    key: string;
    name: string;
    description: string;
    category: string;
}

// Tên các nhóm quyền bằng tiếng Việt
export const PERMISSION_CATEGORIES: Record<string, string> = {
    'Users': 'Quản lý người dùng',
    'Roles': 'Quản lý vai trò',
    'Catalog': 'Quản lý sản phẩm',
    'Sales': 'Quản lý bán hàng',
    'Repairs': 'Quản lý sửa chữa',
    'Inventory': 'Quản lý kho',
    'Procurement': 'Quản lý mua hàng',
    'Accounting': 'Kế toán',
    'Marketing': 'Marketing',
    'Reporting': 'Báo cáo',
    'System': 'Hệ thống',
};

// Chi tiết từng quyền với tên và mô tả tiếng Việt
export const PERMISSION_DETAILS: Record<string, { name: string; description: string }> = {
    // Quản lý người dùng
    'Permissions.Users.View': {
        name: 'Xem người dùng',
        description: 'Xem danh sách và thông tin người dùng'
    },
    'Permissions.Users.Create': {
        name: 'Tạo người dùng',
        description: 'Tạo tài khoản người dùng mới'
    },
    'Permissions.Users.Edit': {
        name: 'Sửa người dùng',
        description: 'Chỉnh sửa thông tin người dùng'
    },
    'Permissions.Users.Delete': {
        name: 'Xóa/Khóa người dùng',
        description: 'Khóa hoặc vô hiệu hóa tài khoản'
    },
    'Permissions.Users.ManageRoles': {
        name: 'Phân quyền người dùng',
        description: 'Gán vai trò cho người dùng'
    },

    // Quản lý vai trò
    'Permissions.Roles.View': {
        name: 'Xem vai trò',
        description: 'Xem danh sách vai trò và quyền hạn'
    },
    'Permissions.Roles.Create': {
        name: 'Tạo vai trò',
        description: 'Tạo vai trò mới trong hệ thống'
    },
    'Permissions.Roles.Edit': {
        name: 'Sửa vai trò',
        description: 'Chỉnh sửa quyền hạn của vai trò'
    },
    'Permissions.Roles.Delete': {
        name: 'Xóa vai trò',
        description: 'Xóa vai trò khỏi hệ thống'
    },

    // Quản lý sản phẩm
    'Permissions.Catalog.View': {
        name: 'Xem sản phẩm',
        description: 'Xem danh mục, sản phẩm, thương hiệu'
    },
    'Permissions.Catalog.Create': {
        name: 'Thêm sản phẩm',
        description: 'Tạo sản phẩm, danh mục, thương hiệu mới'
    },
    'Permissions.Catalog.Edit': {
        name: 'Sửa sản phẩm',
        description: 'Chỉnh sửa thông tin sản phẩm'
    },
    'Permissions.Catalog.Delete': {
        name: 'Xóa sản phẩm',
        description: 'Xóa hoặc ẩn sản phẩm'
    },

    // Quản lý bán hàng
    'Permissions.Sales.ViewOrders': {
        name: 'Xem đơn hàng',
        description: 'Xem danh sách và chi tiết đơn hàng'
    },
    'Permissions.Sales.ManageOrders': {
        name: 'Quản lý đơn hàng',
        description: 'Chỉnh sửa, hủy đơn hàng'
    },
    'Permissions.Sales.UpdateStatus': {
        name: 'Cập nhật trạng thái',
        description: 'Thay đổi trạng thái đơn hàng'
    },

    // Quản lý sửa chữa
    'Permissions.Repairs.View': {
        name: 'Xem phiếu sửa chữa',
        description: 'Xem danh sách phiếu sửa chữa'
    },
    'Permissions.Repairs.Create': {
        name: 'Tạo phiếu sửa chữa',
        description: 'Tiếp nhận máy sửa chữa'
    },
    'Permissions.Repairs.Edit': {
        name: 'Cập nhật sửa chữa',
        description: 'Chẩn đoán, báo giá sửa chữa'
    },
    'Permissions.Repairs.Complete': {
        name: 'Hoàn thành sửa chữa',
        description: 'Đánh dấu hoàn thành và trả máy'
    },

    // Quản lý kho
    'Permissions.Inventory.View': {
        name: 'Xem tồn kho',
        description: 'Xem số lượng tồn kho sản phẩm'
    },
    'Permissions.Inventory.Adjust': {
        name: 'Điều chỉnh kho',
        description: 'Nhập/xuất kho, điều chỉnh số lượng'
    },
    'Permissions.Inventory.Stocktake': {
        name: 'Kiểm kê kho',
        description: 'Thực hiện kiểm kê định kỳ'
    },

    // Quản lý mua hàng
    'Permissions.Procurement.ViewPO': {
        name: 'Xem đơn mua hàng',
        description: 'Xem danh sách đơn đặt hàng NCC'
    },
    'Permissions.Procurement.CreatePO': {
        name: 'Tạo đơn mua hàng',
        description: 'Lập đơn đặt hàng nhà cung cấp'
    },
    'Permissions.Procurement.ApprovePO': {
        name: 'Duyệt đơn mua hàng',
        description: 'Phê duyệt đơn đặt hàng'
    },

    // Kế toán
    'Permissions.Accounting.View': {
        name: 'Xem kế toán',
        description: 'Xem dữ liệu kế toán, công nợ'
    },
    'Permissions.Accounting.ManageInvoices': {
        name: 'Quản lý hóa đơn',
        description: 'Tạo, sửa hóa đơn, phiếu thu chi'
    },
    'Permissions.Accounting.ApproveDebt': {
        name: 'Duyệt công nợ',
        description: 'Phê duyệt công nợ khách hàng'
    },

    // Marketing
    'Permissions.Marketing.Manage': {
        name: 'Quản lý Marketing',
        description: 'Quản lý khuyến mãi, voucher, CMS'
    },

    // Báo cáo
    'Permissions.Reporting.View': {
        name: 'Xem báo cáo',
        description: 'Xem các báo cáo tổng hợp'
    },
    'Permissions.Reporting.ViewFinancial': {
        name: 'Xem báo cáo tài chính',
        description: 'Xem doanh thu, lợi nhuận (nhạy cảm)'
    },

    // Hệ thống
    'Permissions.System.Config': {
        name: 'Cấu hình hệ thống',
        description: 'Thay đổi cài đặt hệ thống'
    },
};

// Hàm lấy tên category tiếng Việt
export const getCategoryName = (permissionKey: string): string => {
    const parts = permissionKey.split('.');
    if (parts.length >= 2) {
        return PERMISSION_CATEGORIES[parts[1]] || parts[1];
    }
    return 'Khác';
};

// Hàm lấy thông tin permission
export const getPermissionInfo = (permissionKey: string): PermissionInfo => {
    const details = PERMISSION_DETAILS[permissionKey];
    const category = getCategoryName(permissionKey);

    if (details) {
        return {
            key: permissionKey,
            name: details.name,
            description: details.description,
            category
        };
    }

    // Fallback nếu không tìm thấy
    const parts = permissionKey.split('.');
    return {
        key: permissionKey,
        name: parts[parts.length - 1],
        description: permissionKey,
        category
    };
};

// Hàm nhóm permissions theo category
export const groupPermissionsByCategory = (permissions: string[]): Record<string, PermissionInfo[]> => {
    const grouped: Record<string, PermissionInfo[]> = {};

    permissions.forEach(perm => {
        const info = getPermissionInfo(perm);
        if (!grouped[info.category]) {
            grouped[info.category] = [];
        }
        grouped[info.category].push(info);
    });

    return grouped;
};

// Thứ tự hiển thị các category
export const CATEGORY_ORDER = [
    'Quản lý người dùng',
    'Quản lý vai trò',
    'Quản lý sản phẩm',
    'Quản lý bán hàng',
    'Quản lý sửa chữa',
    'Quản lý kho',
    'Quản lý mua hàng',
    'Kế toán',
    'Marketing',
    'Báo cáo',
    'Hệ thống',
];
