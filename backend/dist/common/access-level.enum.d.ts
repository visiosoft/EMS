export declare enum AccessLevel {
    Employee = "Employee",
    Administrator = "Administrator",
    SuperAdmin = "Super Admin"
}
export declare const ACCESS_LEVEL_HIERARCHY: AccessLevel[];
export declare function meetsAccessLevel(userLevel: AccessLevel, requiredLevel: AccessLevel): boolean;
