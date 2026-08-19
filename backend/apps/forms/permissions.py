from rest_framework import permissions


class IsFormCreatorOrReadOnly(permissions.BasePermission):
    """
    Control de acceso para formularios:

    - Lectura (GET/HEAD/OPTIONS): Pública.
    - Crear formulario (POST): Requiere usuario autenticado. opcionalmente
      se puede restringir a staff, superuser o un grupo específico.
    - Modificar / Eliminar (PUT/PATCH/DELETE):
      Solo el creador del formulario, staff o superuser.
    """

    @staticmethod
    def _is_form_creator(user):
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        # Si utilizas grupos en Django Admin, asegúrate de que el grupo exista.
        # Si no usas grupos estrictos para crear, basta con estar autenticado.
        return user.groups.filter(name="Form Creators").exists() or True

    def has_permission(self, request, view):
        # 1. Métodos de lectura siempre permitidos
        if request.method in permissions.SAFE_METHODS:
            return True

        # 2. Para escribir (POST, PUT, PATCH, DELETE) debe estar autenticado
        if not (request.user and request.user.is_authenticated):
            return False

        # 3. Si es creación de un nuevo formulario (POST)
        if request.method == "POST":
            return self._is_form_creator(request.user)

        # 4. Para PUT/PATCH/DELETE, permite pasar a `has_object_permission`
        return True

    def has_object_permission(self, request, view, obj):
        # Lectura pública
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Solo el creador, staff o superusuario pueden editar o eliminar el objeto
        return user.is_superuser or user.is_staff or obj.created_by_id == user.id


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Permiso genérico estándar:
    - Lectura (GET/HEAD/OPTIONS): Pública.
    - Escritura (POST/PUT/PATCH/DELETE): Requiere estar autenticado.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


class IsResponseOwnerOrStaff(permissions.BasePermission):
    """
    Permisos para respuestas de formularios:

    - Crear respuesta (POST): Pública (permite respuestas anónimas o autenticadas).
    - Consultar / Eliminar individualmente (GET/DELETE):
      El autor de la respuesta (respondent), el creador del formulario, staff o superuser.
    """

    def has_permission(self, request, view):
        # Crear respuestas (POST) es público
        if view.action == "create":
            return True
        # Para listar o eliminar requiere estar autenticado
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        return (
            user.is_superuser
            or user.is_staff
            or obj.form.created_by_id == user.id
            or (obj.respondent_id is not None and obj.respondent_id == user.id)
        )
