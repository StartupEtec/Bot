export const startup = {
  name: 'Laborin',
  tagline: 'Un trabajo, dos lados, una sola plataforma.',
  description:
    'Laborin conecta clientes con profesionales independientes para servicios puntuales y locales, con perfiles verificados y pagos protegidos.',
  appUrl: 'https://app.laborin.app/',
  landingUrl: 'https://laborin.app/',
  sources: [
    'Landing/PRODUCT.md',
    'Landing/components/Faq.js',
    'Landing/components/Hero.js',
    'Landing/components/Roles.js',
    'Landing/components/Trust.js',
    'Frontend/src/navigation/AppNavigator.tsx',
    'Frontend/src/screens/RegisterScreen.tsx',
    'Frontend/src/screens/OtpVerificationScreen.tsx',
    'Frontend/src/screens/CompleteProfileScreen.tsx',
    'Frontend/src/screens/ProfileScreen.tsx',
    'Frontend/src/components/register/TermsModal.tsx',
    'Backend/src/app.js',
    'Backend/docs/openapi.yaml',
  ],
  steps: [
    'Publicá el trabajo: describí el servicio y la ubicación.',
    'Compará propuestas: revisá perfiles verificados y sus propuestas.',
    'Pagá con protección: cerrá el acuerdo y pagá dentro de la plataforma.',
  ],
  trust: ['Identidad verificada', 'Ubicación real', 'Pago protegido con Stripe'],
  roles: {
    client:
      'Cliente: publicás trabajos, recibís propuestas de perfiles verificados y pagás con protección.',
    worker:
      'Trabajador: mostrás tu trabajo, elegís dónde trabajar y recibís contactos alineados a tu perfil y ubicación.',
  },
  faq: [
    {
      id: 'que-es',
      question: '¿Qué es Laborin?',
      answer:
        'Es una plataforma on-demand que conecta a clientes con profesionales independientes para servicios puntuales y locales.',
      keywords: ['que es laborin', 'plataforma', 'on demand', 'servicios'],
    },
    {
      id: 'para-quien',
      question: '¿Para quién es?',
      answer:
        'Para quien necesita contratar un servicio y para quien quiere ofrecerlo. Una sola cuenta permite alternar entre ambos roles.',
      keywords: ['para quien', 'publico', 'cliente', 'trabajador', 'proveedor'],
    },
    {
      id: 'problema',
      question: '¿Qué problema resuelve?',
      answer:
        'Reduce la fricción de buscar, comparar y acordar un servicio con información clara sobre quién lo hace, dónde trabaja y en qué condiciones.',
      keywords: ['problema', 'friccion', 'buscar', 'comparar', 'acordar'],
    },
    {
      id: 'confianza',
      question: '¿Cómo genera confianza?',
      answer:
        'Con verificación de identidad, ubicación y pagos protegidos procesados con Stripe dentro de la app.',
      keywords: ['confianza', 'verificacion', 'identidad', 'ubicacion', 'stripe', 'seguro'],
    },
    {
      id: 'rubro',
      question: '¿Está limitada a un rubro?',
      answer:
        'No. La plataforma organiza profesionales por categorías de servicio para que cada trabajo encuentre al perfil adecuado.',
      keywords: ['rubro', 'categoria', 'categorias', 'oficios', 'servicios'],
    },
    {
      id: 'donde',
      question: '¿Dónde vive Laborin?',
      answer:
        'La app está disponible en iOS, Android y web en app.laborin.app. Esta landing es la puerta de entrada en laborin.app.',
      keywords: ['donde', 'app', 'ios', 'android', 'web', 'landing', 'link'],
    },
  ],
  flows: [
    {
      id: 'pasos',
      title: 'Cómo funciona',
      answer:
        'Del aviso al pago, con menos fricción.\n1. Publicá el trabajo.\n2. Compará propuestas de perfiles verificados.\n3. Pagá con protección dentro de la plataforma.',
      keywords: ['como funciona', 'pasos', 'publicar', 'propuestas', 'pagar', 'trabajo'],
    },
    {
      id: 'registro',
      title: 'Cómo registrarse',
      answer:
        'En la app: Registrarse → completá nombre, apellido, email, teléfono y contraseña → aceptá los términos → verificá el código OTP. La contraseña necesita 8 caracteres, mayúscula, minúscula, número y símbolo.',
      keywords: ['registro', 'registrarme', 'crear cuenta', 'alta', 'password', 'contrasena'],
    },
    {
      id: 'otp',
      title: 'Verificación con OTP',
      answer:
        'Al registrarte o iniciar sesión, la app envía un código de 6 dígitos. Si no llegó o venció, usá “Reenviar código” (se habilita a los 30 segundos). El backend rechaza códigos vencidos o con demasiados intentos.',
      keywords: ['otp', 'codigo', 'verificar', 'no me llega', 'reenviar', 'expirado'],
    },
    {
      id: 'perfil',
      title: 'Completar el perfil',
      answer:
        'Desde Pantalla Principal → “Terminar de completar perfil ahora”. Necesitás foto tuya, frente y dorso del DNI o pasaporte y fecha de nacimiento. Los mayores de 18 acceden a todas las funciones; los menores quedan en modo cliente.',
      keywords: ['perfil', 'dni', 'documento', 'selfie', 'foto', 'identidad', 'verificacion'],
    },
    {
      id: 'cambiar-rol',
      title: 'Cambiar de rol',
      answer:
        'Sí. Una sola cuenta permite alternar entre Cliente y Trabajador. En la app: Mi Perfil → Cambiar Rol → elegí Cliente o Trabajador. Para activar modo Trabajador puede requerirse certificación aprobada.',
      keywords: [
        'cambiar rol',
        'cambio de rol',
        'como cambio',
        'cambio',
        'rol',
        'roles',
        'cliente',
        'trabajador',
        'proveedor',
        'alternar',
      ],
    },
    {
      id: 'recuperar-password',
      title: 'Recuperar contraseña',
      answer:
        'En Login → “¿Olvidaste tu contraseña?” → ingresá email o teléfono → verificá el código de 6 dígitos → creá una contraseña nueva con los mismos requisitos de complejidad.',
      keywords: ['olvide', 'olvide mi contrasena', 'recuperar', 'reset', 'contrasena', 'password'],
    },
    {
      id: 'escrow',
      title: 'Pago protegido con Escrow',
      answer:
        'Los pagos quedan bloqueados en custodia (Escrow) hasta que el servicio sea confirmado satisfactoriamente. Según la landing, los pagos se procesan con Stripe dentro de la app.',
      keywords: ['escrow', 'pago', 'pagos', 'custodia', 'stripe', 'protegido', 'cobro'],
    },
    {
      id: 'cliente',
      title: 'Modo Cliente',
      answer:
        'Como Cliente podés publicar trabajos, recibir propuestas de perfiles verificados y pagar con protección. Encontrá profesionales para todo lo que necesités.',
      keywords: ['modo cliente', 'como cliente', 'contratar', 'publicar trabajo'],
    },
    {
      id: 'trabajador',
      title: 'Modo Trabajador',
      answer:
        'Como Trabajador podés publicar tus servicios, elegir tus horarios y zonas, y cobrar con seguridad al completar cada trabajo.',
      keywords: ['modo trabajador', 'como trabajador', 'ofrecer servicios', 'ganar', 'cobrar'],
    },
    {
      id: 'app',
      title: 'Dónde usar Laborin',
      answer:
        'Descargá o abrí la app en https://app.laborin.app/ (iOS, Android y web). La landing informativa está en https://laborin.app/.',
      keywords: ['app', 'descargar', 'ios', 'android', 'web', 'link', 'laborin app'],
    },
    {
      id: 'contacto',
      title: 'Contacto y soporte',
      answer:
        'La landing y el frontend no publican un canal oficial de soporte ni datos de contacto. Por ahora, este bot puede responder preguntas y derivarte a la app. Si necesitás escalar un caso, escribí a los administradores configurados en el bot.',
      keywords: ['contacto', 'soporte', 'ayuda', 'problema', 'humano', 'reclamo'],
    },
  ],
};
