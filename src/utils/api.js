// utils/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL+ "/api/v1"

export const api = {
  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // CRUD operations
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },

  // Upload methods
  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
  },

  uploadMultiple(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
  },

  // ==================== AUTHENTICATION ====================
  auth: {
    login(credentials) {
      return api.post('/auth/login', credentials);
    },
    register(userData) {
      return api.post('/auth/register', userData);
    },
    refreshToken() {
      return api.post('/auth/refresh-token');
    },
    getCurrentUser() {
      return api.get('/users/me');
    },
    updateUser(id, userData) {
      return api.put(`/users/${id}`, userData);
    },
    deleteUser(id) {
      return api.delete(`/users/${id}`);
    },
    updateUserRole(id, roleData) {
      return api.put(`/users/${id}/role`, roleData);
    },
  },

  // ==================== USER MANAGEMENT ====================
  users: {
    getAll(params = {}) {
      return api.get('/users', params);
    },
    getById(id) {
      return api.get(`/users/${id}`);
    },
    create(userData) {
      return api.post('/users', userData);
    },
    update(id, userData) {
      return api.put(`/users/${id}`, userData);
    },
    delete(id) {
      return api.delete(`/users/${id}`);
    },
    getPreferences(userId) {
      return api.get(`/user-preferences/${userId}`);
    },
    updatePreferences(userId, preferences) {
      return api.put(`/user-preferences/${userId}`, preferences);
    },
  },

  // ==================== ROLES & PERMISSIONS ====================
  roles: {
    getAll(params = {}) {
      return api.get('/roles', params);
    },
    getById(id) {
      return api.get(`/roles/${id}`);
    },
    create(roleData) {
      return api.post('/roles', roleData);
    },
    update(id, roleData) {
      return api.put(`/roles/${id}`, roleData);
    },
    delete(id) {
      return api.delete(`/roles/${id}`);
    },
    updatePermissions(id, permissions) {
      return api.put(`/roles/${id}/permissions`, permissions);
    },
  },

  permissions: {
    getAll(params = {}) {
      return api.get('/permissions', params);
    },
    getById(id) {
      return api.get(`/permissions/${id}`);
    },
    create(permissionData) {
      return api.post('/permissions', permissionData);
    },
    update(id, permissionData) {
      return api.put(`/permissions/${id}`, permissionData);
    },
    delete(id) {
      return api.delete(`/permissions/${id}`);
    },
  },

  // ==================== ASSETS & MEDIA ====================
  assets: {
    getAll(params = {}) {
      return api.get('/assets', params);
    },
    getById(id) {
      return api.get(`/assets/${id}`);
    },
    upload(assetData, file) {
      const formData = new FormData();
      formData.append('file', file);
      Object.keys(assetData).forEach(key => {
        formData.append(key, assetData[key]);
      });
      return api.upload('/assets', formData);
    },
    uploadMultiple(files, assetData = {}) {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      Object.keys(assetData).forEach(key => {
        formData.append(key, assetData[key]);
      });
      return api.uploadMultiple('/assets/bulk', formData);
    },
    update(id, assetData, file) {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      Object.keys(assetData).forEach(key => {
        formData.append(key, assetData[key]);
      });
      return api.upload(`/assets/${id}`, formData);
    },
    delete(id) {
      return api.delete(`/assets/${id}`);
    },
  },

  mediaAssets: {
    getAll(params = {}) {
      return api.get('/media-assets', params);
    },
    getById(id) {
      return api.get(`/media-assets/${id}`);
    },
    create(mediaData) {
      return api.post('/media-assets', mediaData);
    },
    update(id, mediaData) {
      return api.put(`/media-assets/${id}`, mediaData);
    },
    delete(id) {
      return api.delete(`/media-assets/${id}`);
    },
    getByCoach(coachId, params = {}) {
      return api.get(`/media-assets/coach/${coachId}`, params);
    },
  },

  // ==================== WORKOUT MANAGEMENT ====================
  exercises: {
    getAll(params = {}) {
      return api.get('/exercises', params);
    },
    getById(id) {
      return api.get(`/exercises/${id}`);
    },
    create(exerciseData) {
      return api.post('/exercises', exerciseData);
    },
    update(id, exerciseData) {
      return api.put(`/exercises/${id}`, exerciseData);
    },
    delete(id) {
      return api.delete(`/exercises/${id}`);
    },
  },

  exerciseCategories: {
    getAll(params = {}) {
      return api.get('/exercise-categories', params);
    },
    getById(id) {
      return api.get(`/exercise-categories/${id}`);
    },
    create(categoryData) {
      return api.post('/exercise-categories', categoryData);
    },
    update(id, categoryData) {
      return api.put(`/exercise-categories/${id}`, categoryData);
    },
    delete(id) {
      return api.delete(`/exercise-categories/${id}`);
    },
  },

  exerciseMedia: {
    getAll(params = {}) {
      return api.get('/exercise-media', params);
    },
    getById(id) {
      return api.get(`/exercise-media/${id}`);
    },
    create(mediaData) {
      return api.post('/exercise-media', mediaData);
    },
    update(id, mediaData) {
      return api.put(`/exercise-media/${id}`, mediaData);
    },
    delete(id) {
      return api.delete(`/exercise-media/${id}`);
    },
    getByExercise(exerciseId, params = {}) {
      return api.get(`/exercise-media/exercise/${exerciseId}`, params);
    },
  },

  exerciseAlternatives: {
    getAll(params = {}) {
      return api.get('/exercise-alternatives', params);
    },
    getById(id) {
      return api.get(`/exercise-alternatives/${id}`);
    },
    create(alternativeData) {
      return api.post('/exercise-alternatives', alternativeData);
    },
    update(id, alternativeData) {
      return api.put(`/exercise-alternatives/${id}`, alternativeData);
    },
    delete(id) {
      return api.delete(`/exercise-alternatives/${id}`);
    },
    getByExercise(exerciseId, params = {}) {
      return api.get(`/exercise-alternatives/exercise/${exerciseId}`, params);
    },
  },

  workouts: {
    getAll(params = {}) {
      return api.get('/workouts', params);
    },
    getById(id) {
      return api.get(`/workouts/${id}`);
    },
    create(workoutData) {
      return api.post('/workouts', workoutData);
    },
    update(id, workoutData) {
      return api.put(`/workouts/${id}`, workoutData);
    },
    delete(id) {
      return api.delete(`/workouts/${id}`);
    },
  },

  workoutExercises: {
    getAll(params = {}) {
      return api.get('/workout-exercises', params);
    },
    getById(id) {
      return api.get(`/workout-exercises/${id}`);
    },
    create(exerciseData) {
      return api.post('/workout-exercises', exerciseData);
    },
    update(id, exerciseData) {
      return api.put(`/workout-exercises/${id}`, exerciseData);
    },
    delete(id) {
      return api.delete(`/workout-exercises/${id}`);
    },
    getByWorkout(workoutId, params = {}) {
      return api.get(`/workout-exercises/workout/${workoutId}`, params);
    },
  },

  workoutSetLogs: {
    getAll(params = {}) {
      return api.get('/workout-set-logs', params);
    },
    getById(id) {
      return api.get(`/workout-set-logs/${id}`);
    },
    create(logData) {
      return api.post('/workout-set-logs', logData);
    },
    createBulk(logsData) {
      return api.post('/workout-set-logs/bulk', logsData);
    },
    update(id, logData) {
      return api.put(`/workout-set-logs/${id}`, logData);
    },
    delete(id) {
      return api.delete(`/workout-set-logs/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/workout-set-logs/user/${userId}`, params);
    },
    getByExercise(exerciseId, params = {}) {
      return api.get(`/workout-set-logs/exercise/${exerciseId}`, params);
    },
  },

  // ==================== PROGRAM MANAGEMENT ====================
  programTemplates: {
    getAll(params = {}) {
      return api.get('/program-templates', params);
    },
    getById(id) {
      return api.get(`/program-templates/${id}`);
    },
    create(templateData) {
      return api.post('/program-templates', templateData);
    },
    update(id, templateData) {
      return api.put(`/program-templates/${id}`, templateData);
    },
    delete(id) {
      return api.delete(`/program-templates/${id}`);
    },
  },

  programTemplateDays: {
    getAll(params = {}) {
      return api.get('/program-template-days', params);
    },
    getById(id) {
      return api.get(`/program-template-days/${id}`);
    },
    create(dayData) {
      return api.post('/program-template-days', dayData);
    },
    update(id, dayData) {
      return api.put(`/program-template-days/${id}`, dayData);
    },
    delete(id) {
      return api.delete(`/program-template-days/${id}`);
    },
    getByTemplate(templateId, params = {}) {
      return api.get(`/program-template-days/template/${templateId}`, params);
    },
  },

  assignedPrograms: {
    getAll(params = {}) {
      return api.get('/assigned-programs', params);
    },
    getById(id) {
      return api.get(`/assigned-programs/${id}`);
    },
    create(assignmentData) {
      return api.post('/assigned-programs', assignmentData);
    },
    update(id, assignmentData) {
      return api.put(`/assigned-programs/${id}`, assignmentData);
    },
    delete(id) {
      return api.delete(`/assigned-programs/${id}`);
    },
    activate(id) {
      return api.put(`/assigned-programs/${id}/activate`);
    },
    deactivate(id) {
      return api.put(`/assigned-programs/${id}/deactivate`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/assigned-programs/user/${userId}`, params);
    },
  },

  // ==================== NUTRITION MANAGEMENT ====================
  foods: {
    getAll(params = {}) {
      return api.get('/foods', params);
    },
    getById(id) {
      return api.get(`/foods/${id}`);
    },
    create(foodData) {
      return api.post('/foods', foodData);
    },
    update(id, foodData) {
      return api.put(`/foods/${id}`, foodData);
    },
    delete(id) {
      return api.delete(`/foods/${id}`);
    },
  },

  foodSubstitutions: {
    getAll(params = {}) {
      return api.get('/food-substitutions', params);
    },
    getById(id) {
      return api.get(`/food-substitutions/${id}`);
    },
    create(substitutionData) {
      return api.post('/food-substitutions', substitutionData);
    },
    update(id, substitutionData) {
      return api.put(`/food-substitutions/${id}`, substitutionData);
    },
    delete(id) {
      return api.delete(`/food-substitutions/${id}`);
    },
    getByFood(foodId, params = {}) {
      return api.get(`/food-substitutions/food/${foodId}`, params);
    },
  },

  meals: {
    getAll(params = {}) {
      return api.get('/meals', params);
    },
    getById(id) {
      return api.get(`/meals/${id}`);
    },
    create(mealData) {
      return api.post('/meals', mealData);
    },
    update(id, mealData) {
      return api.put(`/meals/${id}`, mealData);
    },
    delete(id) {
      return api.delete(`/meals/${id}`);
    },
    getByCoach(coachId, params = {}) {
      return api.get(`/meals/coach/${coachId}`, params);
    },
  },

  mealItems: {
    getAll(params = {}) {
      return api.get('/meal-items', params);
    },
    getById(id) {
      return api.get(`/meal-items/${id}`);
    },
    create(itemData) {
      return api.post('/meal-items', itemData);
    },
    update(id, itemData) {
      return api.put(`/meal-items/${id}`, itemData);
    },
    delete(id) {
      return api.delete(`/meal-items/${id}`);
    },
    getByMeal(mealId, params = {}) {
      return api.get(`/meal-items/meal/${mealId}`, params);
    },
  },

  dietPlanTemplates: {
    getAll(params = {}) {
      return api.get('/diet-plan-templates', params);
    },
    getById(id) {
      return api.get(`/diet-plan-templates/${id}`);
    },
    create(templateData) {
      return api.post('/diet-plan-templates', templateData);
    },
    update(id, templateData) {
      return api.put(`/diet-plan-templates/${id}`, templateData);
    },
    delete(id) {
      return api.delete(`/diet-plan-templates/${id}`);
    },
  },

  assignedDiets: {
    getAll(params = {}) {
      return api.get('/assigned-diets', params);
    },
    getById(id) {
      return api.get(`/assigned-diets/${id}`);
    },
    create(assignmentData) {
      return api.post('/assigned-diets', assignmentData);
    },
    update(id, assignmentData) {
      return api.put(`/assigned-diets/${id}`, assignmentData);
    },
    delete(id) {
      return api.delete(`/assigned-diets/${id}`);
    },
    activate(id) {
      return api.put(`/assigned-diets/${id}/activate`);
    },
    deactivate(id) {
      return api.put(`/assigned-diets/${id}/deactivate`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/assigned-diets/user/${userId}`, params);
    },
  },

  mealLogs: {
    getAll(params = {}) {
      return api.get('/meal-logs', params);
    },
    getById(id) {
      return api.get(`/meal-logs/${id}`);
    },
    create(logData) {
      return api.post('/meal-logs', logData);
    },
    update(id, logData) {
      return api.put(`/meal-logs/${id}`, logData);
    },
    delete(id) {
      return api.delete(`/meal-logs/${id}`);
    },
    complete(id) {
      return api.put(`/meal-logs/${id}/complete`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/meal-logs/user/${userId}`, params);
    },
  },

  waterIntake: {
    getAll(params = {}) {
      return api.get('/water-intake', params);
    },
    getById(id) {
      return api.get(`/water-intake/${id}`);
    },
    create(intakeData) {
      return api.post('/water-intake', intakeData);
    },
    update(id, intakeData) {
      return api.put(`/water-intake/${id}`, intakeData);
    },
    delete(id) {
      return api.delete(`/water-intake/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/water-intake/user/${userId}`, params);
    },
  },

  supplementLogs: {
    getAll(params = {}) {
      return api.get('/supplement-logs', params);
    },
    getById(id) {
      return api.get(`/supplement-logs/${id}`);
    },
    create(logData) {
      return api.post('/supplement-logs', logData);
    },
    update(id, logData) {
      return api.put(`/supplement-logs/${id}`, logData);
    },
    delete(id) {
      return api.delete(`/supplement-logs/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/supplement-logs/user/${userId}`, params);
    },
  },

  // ==================== PROGRESS TRACKING ====================
  progress: {
    getAll(params = {}) {
      return api.get('/progress', params);
    },
    getById(id) {
      return api.get(`/progress/${id}`);
    },
    create(progressData) {
      return api.post('/progress', progressData);
    },
    update(id, progressData) {
      return api.put(`/progress/${id}`, progressData);
    },
    delete(id) {
      return api.delete(`/progress/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/progress/user/${userId}`, params);
    },
  },

  cardioSessions: {
    getAll(params = {}) {
      return api.get('/cardio-sessions', params);
    },
    getById(id) {
      return api.get(`/cardio-sessions/${id}`);
    },
    create(sessionData) {
      return api.post('/cardio-sessions', sessionData);
    },
    update(id, sessionData) {
      return api.put(`/cardio-sessions/${id}`, sessionData);
    },
    delete(id) {
      return api.delete(`/cardio-sessions/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/cardio-sessions/user/${userId}`, params);
    },
  },

  sleepLogs: {
    getAll(params = {}) {
      return api.get('/sleep-logs', params);
    },
    getById(id) {
      return api.get(`/sleep-logs/${id}`);
    },
    create(logData) {
      return api.post('/sleep-logs', logData);
    },
    update(id, logData) {
      return api.put(`/sleep-logs/${id}`, logData);
    },
    delete(id) {
      return api.delete(`/sleep-logs/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/sleep-logs/user/${userId}`, params);
    },
  },

  stepsLogs: {
    getAll(params = {}) {
      return api.get('/steps-logs', params);
    },
    getById(id) {
      return api.get(`/steps-logs/${id}`);
    },
    create(logData) {
      return api.post('/steps-logs', logData);
    },
    update(id, logData) {
      return api.put(`/steps-logs/${id}`, logData);
    },
    delete(id) {
      return api.delete(`/steps-logs/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/steps-logs/user/${userId}`, params);
    },
  },

  weeklyCheckins: {
    getAll(params = {}) {
      return api.get('/weekly-checkins', params);
    },
    getById(id) {
      return api.get(`/weekly-checkins/${id}`);
    },
    create(checkinData) {
      return api.post('/weekly-checkins', checkinData);
    },
    update(id, checkinData) {
      return api.put(`/weekly-checkins/${id}`, checkinData);
    },
    delete(id) {
      return api.delete(`/weekly-checkins/${id}`);
    },
    submit(id) {
      return api.put(`/weekly-checkins/${id}/submit`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/weekly-checkins/user/${userId}`, params);
    },
  },

  weeklyAnalyses: {
    getByCheckin(checkinId) {
      return api.get(`/weekly-analyses/checkin/${checkinId}`);
    },
    create(analysisData) {
      return api.post('/weekly-analyses', analysisData);
    },
    update(id, analysisData) {
      return api.put(`/weekly-analyses/${id}`, analysisData);
    },
  },

  // ==================== COMMUNICATION ====================
  messages: {
    getAll(params = {}) {
      return api.get('/messages', params);
    },
    getById(id) {
      return api.get(`/messages/${id}`);
    },
    create(messageData) {
      return api.post('/messages', messageData);
    },
    broadcast(messageData) {
      return api.post('/messages/broadcast', messageData);
    },
    delete(id) {
      return api.delete(`/messages/${id}`);
    },
    getConversation(userId1, userId2, params = {}) {
      return api.get(`/messages/conversation/${userId1}/${userId2}`, params);
    },
  },

  notifications: {
    getAll(params = {}) {
      return api.get('/notifications', params);
    },
    getById(id) {
      return api.get(`/notifications/${id}`);
    },
    create(notificationData) {
      return api.post('/notifications', notificationData);
    },
    markAsRead(id) {
      return api.put(`/notifications/${id}/read`);
    },
    markAllAsRead() {
      return api.put('/notifications/read-all');
    },
    delete(id) {
      return api.delete(`/notifications/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/notifications/user/${userId}`, params);
    },
  },

  // ==================== FORMS & TEMPLATES ====================
  formTemplates: {
    getAll(params = {}) {
      return api.get('/form-templates', params);
    },
    getById(id) {
      return api.get(`/form-templates/${id}`);
    },
    create(templateData) {
      return api.post('/form-templates', templateData);
    },
    update(id, templateData) {
      return api.put(`/form-templates/${id}`, templateData);
    },
    delete(id) {
      return api.delete(`/form-templates/${id}`);
    },
    getByCoach(coachId, params = {}) {
      return api.get(`/form-templates/coach/${coachId}`, params);
    },
  },

  formResponses: {
    getAll(params = {}) {
      return api.get('/form-responses', params);
    },
    getById(id) {
      return api.get(`/form-responses/${id}`);
    },
    create(responseData) {
      return api.post('/form-responses', responseData);
    },
    update(id, responseData) {
      return api.put(`/form-responses/${id}`, responseData);
    },
    delete(id) {
      return api.delete(`/form-responses/${id}`);
    },
    getByTemplate(templateId, params = {}) {
      return api.get(`/form-responses/template/${templateId}`, params);
    },
    getByUser(userId, params = {}) {
      return api.get(`/form-responses/user/${userId}`, params);
    },
  },

  // ==================== SUBSCRIPTIONS & PAYMENTS ====================
  subscriptions: {
    getAll(params = {}) {
      return api.get('/subscriptions', params);
    },
    getById(id) {
      return api.get(`/subscriptions/${id}`);
    },
    create(subscriptionData) {
      return api.post('/subscriptions', subscriptionData);
    },
    update(id, subscriptionData) {
      return api.put(`/subscriptions/${id}`, subscriptionData);
    },
    cancel(id) {
      return api.put(`/subscriptions/${id}/cancel`);
    },
    delete(id) {
      return api.delete(`/subscriptions/${id}`);
    },
    getByUser(userId, params = {}) {
      return api.get(`/subscriptions/user/${userId}`, params);
    },
  },

  payments: {
    getAll(params = {}) {
      return api.get('/payments', params);
    },
    getById(id) {
      return api.get(`/payments/${id}`);
    },
    create(paymentData) {
      return api.post('/payments', paymentData);
    },
    update(id, paymentData) {
      return api.put(`/payments/${id}`, paymentData);
    },
    updateStatus(id, status) {
      return api.put(`/payments/${id}/status`, { status });
    },
    delete(id) {
      return api.delete(`/payments/${id}`);
    },
    getBySubscription(subscriptionId, params = {}) {
      return api.get(`/payments/subscription/${subscriptionId}`, params);
    },
  },

  inviteCodes: {
    getAll(params = {}) {
      return api.get('/invite-codes', params);
    },
    getById(id) {
      return api.get(`/invite-codes/${id}`);
    },
    getByCode(code) {
      return api.get(`/invite-codes/code/${code}`);
    },
    create(inviteData) {
      return api.post('/invite-codes', inviteData);
    },
    useCode(code, userData) {
      return api.post(`/invite-codes/use/${code}`, userData);
    },
    update(id, inviteData) {
      return api.put(`/invite-codes/${id}`, inviteData);
    },
    delete(id) {
      return api.delete(`/invite-codes/${id}`);
    },
  },

  // ==================== STAFF & ADMINISTRATION ====================
  staffTasks: {
    getAll(params = {}) {
      return api.get('/staff-tasks', params);
    },
    getById(id) {
      return api.get(`/staff-tasks/${id}`);
    },
    create(taskData) {
      return api.post('/staff-tasks', taskData);
    },
    update(id, taskData) {
      return api.put(`/staff-tasks/${id}`, taskData);
    },
    updateStatus(id, status) {
      return api.put(`/staff-tasks/${id}/status`, { status });
    },
    delete(id) {
      return api.delete(`/staff-tasks/${id}`);
    },
    getByAssignee(userId, params = {}) {
      return api.get(`/staff-tasks/assignee/${userId}`, params);
    },
    getByCreator(userId, params = {}) {
      return api.get(`/staff-tasks/creator/${userId}`, params);
    },
  },

  auditLogs: {
    getAll(params = {}) {
      return api.get('/audit-logs', params);
    },
    getById(id) {
      return api.get(`/audit-logs/${id}`);
    },
    delete(id) {
      return api.delete(`/audit-logs/${id}`);
    },
    getByActor(actorId, params = {}) {
      return api.get(`/audit-logs/actor/${actorId}`, params);
    },
    getByEntity(entity, entityId, params = {}) {
      return api.get(`/audit-logs/entity/${entity}/${entityId}`, params);
    },
  },
};

export default api;