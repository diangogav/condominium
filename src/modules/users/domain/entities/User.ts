import { UserRole, UserStatus } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

export interface UserProps {
    id: string;
    email: string;
    name: string;
    phone?: string;
    unit?: string;
    building_id?: string;
    role: UserRole;
    status: UserStatus;
    created_at?: Date;
    updated_at?: Date;
}

export class User {
    constructor(private props: UserProps) {
        if (!props.created_at) {
            this.props.created_at = new Date();
        }
        if (!props.updated_at) {
            this.props.updated_at = new Date();
        }
    }

    get id(): string { return this.props.id; }
    get email(): string { return this.props.email; }
    get name(): string { return this.props.name; }
    get phone(): string | undefined { return this.props.phone; }
    get unit(): string | undefined { return this.props.unit; }
    get building_id(): string | undefined { return this.props.building_id; }
    get role(): UserRole { return this.props.role; }
    get status(): UserStatus { return this.props.status; }
    get created_at(): Date { return this.props.created_at!; }
    get updated_at(): Date { return this.props.updated_at!; }

    isAdmin(): boolean {
        return this.props.role === UserRole.ADMIN;
    }

    isBoardMember(): boolean {
        return this.props.role === UserRole.BOARD;
    }

    isResident(): boolean {
        return this.props.role === UserRole.RESIDENT;
    }

    approve(): void {
        if (this.props.status === UserStatus.ACTIVE) return;
        this.props.status = UserStatus.ACTIVE;
        this.props.updated_at = new Date();
    }

    reject(): void {
        this.props.status = UserStatus.REJECTED;
        this.props.updated_at = new Date();
    }

    isActive(): boolean {
        return this.props.status === UserStatus.ACTIVE;
    }

    updateProfile(data: Partial<Omit<UserProps, 'id' | 'email' | 'role' | 'status' | 'created_at' | 'updated_at'>>): void {
        this.props = {
            ...this.props,
            ...data,
            updated_at: new Date()
        };
    }

    changeRole(newRole: UserRole): void {
        this.props.role = newRole;
        this.props.updated_at = new Date();
    }
}
