const API_URL = 'http://localhost:4000';

// Store token in sessionStorage (automatically cleared on browser close)
const getToken = () => sessionStorage.getItem('authToken');
const setToken = (token: string) => sessionStorage.setItem('authToken', token);
const clearToken = () => sessionStorage.removeItem('authToken');

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const headersObj: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getToken();
  if (token) {
    headersObj['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: headersObj,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Auth
  async register(credentials: {
    username: string;
    password: string;
    company_name: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
  }) {
    const result = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return result;
  },

  async login(credentials: { username: string; password: string }) {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setToken(result.token);
    return result;
  },

  async resendVerification(username: string) {
    const result = await apiCall('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    return result;
  },

  async verifyAccount(username: string, code: string) {
    const result = await apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ username, code }),
    });
    if (result?.token) {
      setToken(result.token);
    }
    return result;
  },

  logout() {
    clearToken();
  },

  // Ports
  async getPorts() {
    const result = await apiCall('/ports');
    return result.ports;
  },

  // Shipments
  async getShipments() {
    const result = await apiCall('/shipments');
    return result.shipments;
  },

  async getShipment(id: number) {
    const result = await apiCall(`/shipments/${id}`);
    return result.shipment;
  },

  async updateShipment(id: number, data: {
    pickup_date?: string;
    status_label?: string;
  }) {
    const result = await apiCall(`/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.shipment || result;
  },

  async createShipment(data: {
    destination_port: number;
    departure_port: number;
    transport_number?: string;
    mbl_number?: string;
    fsl_type?: string;
    container_20?: number;
    container_40?: number;
    actual_time_departure?: string;
    type_of_goods_id?: number;
    pickup_location?: string;
    dropoff_location?: string;
    pickup_date?: string;
  }) {
    const result = await apiCall('/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.shipment;
  },

  async createBooking(data: {
    pickup_location?: string;
    dropoff_location?: string;
    pickup_date?: string;
    container_20?: number;
    container_40?: number;
    type_of_goods_id?: number;
    transport_number?: string;
    mbl_number?: string;
    fsl_type?: string;
    actual_time_departure?: string;
    destination_port?: number | null;
    departure_port?: number | null;
  }) {
    const result = await apiCall('/shipments/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.shipment;
  },

  // Billings
  async getBillings() {
    const result = await apiCall('/billings');
    return result.billings;
  },

  async getBilling(id: number) {
    const result = await apiCall(`/billings/${id}`);
    return result.billing;
  },

  async createBilling(data: {
    shipment: number;
    billing_type: 'TO_SHIPPER' | 'FROM_FSL' | 'FROM_CBR';
    amounts_payable: number;
    currency?: string;
  }) {
    const result = await apiCall('/billings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.billing;
  },

  isAuthenticated() {
    return !!getToken();
  },

  // Admin
  async getAdminShipments() {
    const result = await apiCall('/admin/shipments');
    return Array.isArray(result) ? result : (result.shipments || []);
  },

  async getAdminPorts() {
    const result = await apiCall('/admin/ports');
    return Array.isArray(result) ? result : (result.ports || []);
  },

  async getAdminStatuses() {
    const result = await apiCall('/admin/statuses');
    return Array.isArray(result) ? result : (result.statuses || []);
  },

  async updateAdminShipment(id: number, data: {
    destination_port?: number;
    departure_port?: number;
    fsl_type?: string;
    status_id?: number;
    actual_time_departure?: string;
    pickup_date?: string;
    amount?: number;
  }) {
    const result = await apiCall(`/admin/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.shipment || result;
  },

  async getAdminMetrics(year: number) {
    const result = await apiCall(`/admin/metrics?year=${year}`);
    return result;
  },

  async getAdminMonthly(year: number) {
    const result = await apiCall(`/admin/monthly?year=${year}`);
    return Array.isArray(result) ? result : (result.monthly || []);
  },

  async getAdminYears() {
    const result = await apiCall('/admin/years');
    return Array.isArray(result) ? result : (result.years || []);
  },

  // Profile Management
  async getProfile() {
    const result = await apiCall('/auth/profile');
    return result.profile;
  },

  async updateUsername(newUsername: string) {
    const result = await apiCall('/auth/update-username', {
      method: 'POST',
      body: JSON.stringify({ newUsername }),
    });
    return result;
  },

  async updatePassword(newPassword: string) {
    const result = await apiCall('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    return result;
  },

  async updatePhone(newPhone: string) {
    const result = await apiCall('/auth/update-phone', {
      method: 'POST',
      body: JSON.stringify({ newPhone }),
    });
    return result;
  },

  async updateEmail(newEmail: string) {
    const result = await apiCall('/auth/update-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
    return result;
  },

  async deleteAccount() {
    const result = await apiCall('/auth/delete-account', {
      method: 'DELETE',
    });
    return result;
  },
};
