export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://18.116.33.225:8080";
export const AUTH_STORAGE_KEY = "lionfitness.auth";

export function normalizeUserPhoto(user) {
  if (!user) return user;
  let photoUrl = user.photoUrl || user.photo_url;
  if (photoUrl && photoUrl.includes("/uploads/members")) {
    photoUrl = null;
  }
  const id = user.id;
  if (!photoUrl && id) {
    photoUrl = `/users/${id}/photo`;
  }
  return { ...user, photoUrl, photo_url: photoUrl };
}

export function normalizeMemberPhoto(member) {
  if (!member) return member;
  let photoUrl = member.photoUrl || member.photo_url;
  if (photoUrl && photoUrl.includes("/uploads/members")) {
    photoUrl = null;
  }
  const userId = member.userId || member.user_id;
  if (!photoUrl && userId) {
    photoUrl = `/users/${userId}/photo`;
  }
  return { ...member, photoUrl, photo_url: photoUrl };
}

export function normalizePersonalTrainerPhoto(pt) {
  if (!pt) return pt;
  let photoUrl = pt.photoUrl || pt.photo_url;
  if (photoUrl && photoUrl.includes("/uploads/members")) {
    photoUrl = null;
  }
  const userId = pt.userId || pt.user_id;
  if (!photoUrl && userId) {
    photoUrl = `/users/${userId}/photo`;
  }
  return { ...pt, photoUrl, photo_url: photoUrl };
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    const parsed = JSON.parse(rawSession);
    return typeof parsed?.token === "string" && parsed.token ? parsed.token : null;
  } catch {
    return null;
  }
}

export async function getMyStudents() {
  const list = await getResource("/personal-trainers/me/members", "Failed to fetch personal students");
  return Array.isArray(list) ? list.map(normalizeMemberPhoto) : list;
}

export async function getMySubscription() {
  return getResource("/subscriptions/me", "Não foi possível carregar sua assinatura.");
}

export async function getMyWorkouts() {
  return getResource("/workouts/me", "Não foi possível carregar seus treinos.");
}

export async function getMemberProfile() {
  return getResource("/members/me", "Não foi possível carregar seu perfil.");
}

export async function searchExerciseCatalog(filters = {}) {
  const params = new URLSearchParams();

  // Suporta name, category e muscle — chama o catálogo interno (sem API externa)
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      params.append(key, value.trim());
    }
  });

  const queryString = params.toString();
  const path = queryString ? `/exercise-catalog?${queryString}` : "/exercise-catalog";

  return getResource(path, "Failed to search exercise catalog");
}

export async function createExerciseCatalog(payload) {
  return createResource("/exercise-catalog", payload, "Failed to create custom exercise");
}

export async function createWorkoutExercise(payload) {
  return createResource("/workout-exercises", payload, "Failed to add exercise to workout");
}

export async function getWorkoutSheetsByMember(memberId) {
  return getResource(`/workout-sheets/member/${memberId}`, "Failed to fetch workout sheets");
}

export async function createWorkoutSheet(payload) {
  return createResource("/workout-sheets", payload, "Failed to create workout sheet");
}

export async function getWorkoutExercisesBySheet(workoutSheetId) {
  return getResource(`/workout-exercises/sheet/${workoutSheetId}`, "Failed to fetch workout exercises");
}

function buildRequestHeaders(customHeaders = {}) {
  const token = getStoredAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function buildMultipartRequestHeaders(customHeaders = {}) {
  const token = getStoredAuthToken();
  const headers = {
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function requestResource(path, options, errorMessage) {
  const isMultipart = options?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: isMultipart ? buildMultipartRequestHeaders(options?.headers) : buildRequestHeaders(options?.headers),
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let backendMessage = text;

    if (text) {
      try {
        const data = JSON.parse(text);
        backendMessage = extractBackendMessage(data) || text;
      } catch {
        backendMessage = text;
      }
    }

    throw new Error(backendMessage || errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || errorMessage);
  }

  return Array.isArray(data) ? data : data?.data || data?.items || data;
}

function extractBackendMessage(data) {
  if (!data || typeof data !== "object") return "";

  if (Array.isArray(data.validationErrors) && data.validationErrors.length > 0) {
    return data.validationErrors
      .map(err => err.message || err.defaultMessage || "")
      .filter(Boolean)
      .join(" ");
  }

  const value =
    data.message ||
    data.error ||
    data.detail ||
    data.details ||
    data.title;

  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);

  return "";
}

async function getResource(path, errorMessage) {
  return requestResource(
    path,
    {
      method: "GET",
      cache: "no-store",
    },
    errorMessage
  );
}

async function createResource(path, payload, errorMessage) {
  return requestResource(
    path,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    errorMessage
  );
}

async function updateResource(path, id, payload, errorMessage) {
  return requestResource(
    `${path}/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    errorMessage
  );
}

async function createMultipartResource(path, formData, errorMessage) {
  return requestResource(
    path,
    {
      method: "POST",
      headers: buildMultipartRequestHeaders(),
      body: formData,
    },
    errorMessage
  );
}

async function updateMultipartResource(path, id, formData, errorMessage) {
  return requestResource(
    `${path}/${id}`,
    {
      method: "PUT",
      headers: buildMultipartRequestHeaders(),
      body: formData,
    },
    errorMessage
  );
}

async function deleteResource(path, id, errorMessage) {
  return requestResource(
    `${path}/${id}`,
    {
      method: "DELETE",
    },
    errorMessage
  );
}

export async function getMembers(includeInactive = false) {
  const endpoint = includeInactive ? "/members?includeInactive=true" : "/members";
  const list = await getResource(endpoint, "Failed to fetch members");
  return Array.isArray(list) ? list.map(normalizeMemberPhoto) : list;
}

export async function forgotPassword(email) {
  return createResource(
    "/auth/forgot-password",
    { email },
    "Failed to request password reset"
  );
}

export async function resetPassword(token, newPassword, confirmPassword) {
  return createResource(
    "/auth/reset-password",
    { token, newPassword, confirmPassword },
    "Failed to reset password"
  );
}

export async function createMember(payload) {
  const res = payload instanceof FormData
    ? await createMultipartResource("/members", payload, "Failed to create member")
    : await createResource("/members", payload, "Failed to create member");
  return normalizeMemberPhoto(res);
}

export async function updateMember(id, payload) {
  const res = payload instanceof FormData
    ? await updateMultipartResource("/members", id, payload, "Failed to update member")
    : await updateResource("/members", id, payload, "Failed to update member");
  return normalizeMemberPhoto(res);
}

export async function deleteMember(id) {
  return deleteResource("/members", id, "Failed to delete member");
}

export async function getPlans() {
  return getResource("/plans", "Failed to fetch plans");
}

export async function createPlan(payload) {
  return createResource("/plans", payload, "Failed to create plan");
}

export async function updatePlan(id, payload) {
  return updateResource("/plans", id, payload, "Failed to update plan");
}

export async function deletePlan(id) {
  return deleteResource("/plans", id, "Failed to delete plan");
}

export async function getUsers() {
  const list = await getResource("/users", "Failed to fetch users");
  return Array.isArray(list) ? list.map(normalizeUserPhoto) : list;
}

export async function createUser(payload) {
  const res = payload instanceof FormData
    ? await createMultipartResource("/users", payload, "Failed to create user")
    : await createResource("/users", payload, "Failed to create user");
  return normalizeUserPhoto(res);
}

export async function updateUser(id, payload) {
  const res = payload instanceof FormData
    ? await updateMultipartResource("/users", id, payload, "Failed to update user")
    : await updateResource("/users", id, payload, "Failed to update user");
  return normalizeUserPhoto(res);
}

export async function deleteUser(id) {
  return deleteResource("/users", id, "Failed to delete user");
}

export async function getPersonalTrainers() {
  const list = await getResource("/personal-trainers", "Failed to fetch personal trainers");
  return Array.isArray(list) ? list.map(normalizePersonalTrainerPhoto) : list;
}

export async function createPersonalTrainer(payload) {
  const res = payload instanceof FormData
    ? await createMultipartResource("/personal-trainers", payload, "Failed to create personal trainer")
    : await createResource("/personal-trainers", payload, "Failed to create personal trainer");
  return normalizePersonalTrainerPhoto(res);
}

export async function updatePersonalTrainer(id, payload) {
  const res = payload instanceof FormData
    ? await updateMultipartResource("/personal-trainers", id, payload, "Failed to update personal trainer")
    : await updateResource("/personal-trainers", id, payload, "Failed to update personal trainer");
  return normalizePersonalTrainerPhoto(res);
}

export async function deletePersonalTrainer(id) {
  return deleteResource("/personal-trainers", id, "Failed to delete personal trainer");
}

export async function getSubscriptions() {
  return getResource("/subscriptions", "Failed to fetch subscriptions");
}

export async function createSubscription(payload) {
  return createResource("/subscriptions", payload, "Failed to create subscription");
}

export async function updateSubscription(id, payload) {
  return updateResource("/subscriptions", id, payload, "Failed to update subscription");
}

export async function deleteSubscription(id) {
  return deleteResource("/subscriptions", id, "Failed to delete subscription");
}

export async function cancelSubscription(id) {
  return deleteSubscription(id);
}

export async function getPayments() {
  return getResource("/payments", "Failed to fetch payments");
}

export async function createPayment(payload) {
  return createResource("/payments", payload, "Failed to create payment");
}

export async function updatePayment(id, payload) {
  return updateResource("/payments", id, payload, "Failed to update payment");
}

export async function deletePayment(id) {
  return deleteResource("/payments", id, "Failed to delete payment");
}

export async function getOverdueMembers() {
  const list = await getResource("/members/overdue", "Failed to fetch overdue members");
  return Array.isArray(list) ? list.map(normalizeMemberPhoto) : list;
}

export async function getCancellations() {
  return getResource("/cancellations", "Failed to fetch cancellations");
}

export async function cancelMember(id, payload) {
  return createResource(
    `/members/${id}/cancel`,
    payload,
    "Failed to cancel member"
  );
}

export async function getNewMembersReport(startDate, endDate) {
  return getResource(`/reports/new-members?startDate=${startDate}&endDate=${endDate}`, "Failed to fetch new members report");
}

export async function getCancellationsReport(startDate, endDate) {
  return getResource(`/reports/cancellations?startDate=${startDate}&endDate=${endDate}`, "Failed to fetch cancellations report");
}

export async function generatePixTransaction(subscriptionId, amount = null) {
  return createResource(
    "/payments/pix/generate",
    { subscriptionId, amount },
    "Falha ao gerar cobrança Pix"
  );
}


export async function simulateConfirmPix(transactionId) {
  return createResource(
    `/payments/pix/simulate-confirm/${transactionId}`,
    {},
    "Falha ao simular confirmação de Pix"
  );
}

export async function getPixTransactionStatus(transactionId) {
  return getResource(
    `/payments/pix/${transactionId}/status`,
    "Falha ao consultar status da transação Pix"
  );
}

export async function processCardPayment(payload) {
  return createResource(
    "/payments/card",
    payload,
    "Falha ao processar pagamento com cartão"
  );
}

export async function getMercadoPagoPublicKey() {
  return getResource(
    "/payments/public-key",
    "Falha ao consultar chave pública do Mercado Pago"
  );
}

