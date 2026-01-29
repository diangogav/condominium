export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    unit?: string;
    building_id?: string;
    role: 'resident' | 'admin';
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserProps {
    id: string; // From Auth Provider
    email: string;
    name: string;
    unit?: string;
    building_id?: string;
    role?: 'resident' | 'admin';
}

export interface UpdateUserProps {
    name?: string;
    phone?: string;
    unit?: string;
    building_id?: string;
    settings?: Record<string, any>;
}
