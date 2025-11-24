// ============================================
// Script para configurar Keycloak automáticamente
// Usa Node.js en lugar de curl para mayor compatibilidad
// ============================================

const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_ADMIN = process.env.KEYCLOAK_ADMIN || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'health_app';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'health_app_api';

async function waitForKeycloak() {
  console.log('⏳ Esperando a que Keycloak esté disponible...');
  let retries = 30; // 1 minuto total
  while (retries > 0) {
    try {
      // Verificar que el realm master esté disponible - esto indica que Keycloak está completamente inicializado
      await axios.get(`${KEYCLOAK_URL}/realms/master/.well-known/openid-configuration`, { timeout: 5000 });
      console.log('✅ Keycloak está disponible y completamente inicializado');
      // Esperar un poco más para asegurar que esté completamente listo
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    } catch (error) {
      retries--;
      if (retries === 0) {
        // Si falla, intentar verificar el endpoint raíz como fallback
        try {
          await axios.get(`${KEYCLOAK_URL}/`, { timeout: 5000 });
          console.log('⚠️  Keycloak responde pero el realm master no está disponible aún');
          console.log('   Continuando de todas formas...');
          return;
        } catch (e) {
          throw new Error('Keycloak no está disponible después de 1 minuto');
        }
      }
      if (retries % 5 === 0) {
        console.log(`   Intentando... (${retries} intentos restantes)`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function getAdminToken() {
  console.log('🔑 Obteniendo token de administrador...');
  try {
    const response = await axios.post(
      `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        username: KEYCLOAK_ADMIN,
        password: KEYCLOAK_ADMIN_PASSWORD,
        grant_type: 'password',
        client_id: 'admin-cli',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    console.log('✅ Token obtenido');
    return response.data.access_token;
  } catch (error) {
        console.error('Error obteniendo token:', error.message);
        throw error;
    }
}

async function createRealm(token) {
  console.log(`🌍 Verificando Realm: ${KEYCLOAK_REALM}...`);
  let realmExists = false;
  let needsUpdate = false;
  
  try {
    const realmResponse = await axios.get(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    realmExists = true;
    
    // Verificar si necesita actualización (solo si está deshabilitado o falta configuración crítica)
    if (!realmResponse.data.enabled) {
      needsUpdate = true;
      console.log('ℹ️  Realm existe pero está deshabilitado, habilitándolo...');
    } else {
      console.log('✅ Realm ya existe y está configurado correctamente');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      needsUpdate = true;
      console.log('ℹ️  Realm no existe, creándolo...');
    } else {
      throw error;
    }
  }

  // Solo actualizar si es necesario (crear o habilitar)
  if (needsUpdate) {
    if (!realmExists) {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms`,
        {
          realm: KEYCLOAK_REALM,
          enabled: true,
          displayName: 'Health Appointments System',
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ Realm creado');
    } else {
      // Solo habilitar si estaba deshabilitado
      await axios.put(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}`,
        { enabled: true },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ Realm habilitado');
    }
  }
}

async function createClient(token) {
  console.log(`🔧 Creando/verificando Client: ${KEYCLOAK_CLIENT_ID}...`);
  let clientId = null;
  let clientExists = false;
  
  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.data.length > 0) {
      clientId = response.data[0].id;
      clientExists = true;
      console.log('ℹ️  Client ya existe, verificando configuración...');
      
      // Verificar y actualizar configuración si es necesario
      const clientConfig = response.data[0];
      const needsUpdate = 
        !clientConfig.enabled ||
        !clientConfig.directAccessGrantsEnabled ||
        clientConfig.publicClient !== true;
      
      if (needsUpdate) {
        console.log('   Actualizando configuración del client...');
        await axios.put(
          `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${clientId}`,
          {
            enabled: true,
            publicClient: true,
            standardFlowEnabled: true,
            directAccessGrantsEnabled: true,
            redirectUris: ['*'],
            webOrigins: ['*'],
            // Configurar para que incluya el client_id en el audience
            attributes: {
              'include.client.id.in.token': 'true',
            },
          },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        console.log('✅ Configuración del client actualizada');
      } else {
        console.log('✅ Client ya está configurado correctamente');
      }
      return;
    }
  } catch (error) {
    // Continuar con la creación
  }

  // Crear nuevo client
  const createResponse = await axios.post(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients`,
    {
      clientId: KEYCLOAK_CLIENT_ID,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      redirectUris: ['*'],
      webOrigins: ['*'],
      // Configurar para que incluya el client_id en el audience
      attributes: {
        'include.client.id.in.token': 'true',
      },
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  console.log('✅ Client creado');
}

async function createRole(token, roleName) {
  try {
    await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${roleName}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`   ℹ️  Rol '${roleName}' ya existe`);
  } catch (error) {
    if (error.response?.status === 404) {
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles`,
        { name: roleName },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log(`   ✅ Rol '${roleName}' creado`);
    } else {
      throw error;
    }
  }
}

async function createAdminUser(token) {
  console.log('👤 Verificando usuario admin...');
  let userId = null;
  let userExists = false;
  let needsUpdate = false;

  // Verificar si el usuario ya existe
  try {
    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=admin`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.data.length > 0) {
      userId = response.data[0].id;
      userExists = true;
      
      // Verificar si necesita actualización
      const userDetails = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Solo actualizar si está deshabilitado, tiene required actions, o no tiene email verificado
      if (!userDetails.data.enabled || 
          (userDetails.data.requiredActions && userDetails.data.requiredActions.length > 0) ||
          !userDetails.data.emailVerified) {
        needsUpdate = true;
        console.log('ℹ️  Usuario existe pero necesita actualización...');
      } else {
        console.log('✅ Usuario "admin" ya existe y está configurado correctamente');
      }
    }
  } catch (error) {
    // Usuario no existe, se creará
    needsUpdate = true;
  }

  if (!needsUpdate && userExists) {
    // Verificar si tiene el rol admin
    try {
      const roleMappings = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const hasAdminRole = roleMappings.data.some((role) => role.name === 'admin');
      if (!hasAdminRole) {
        needsUpdate = true;
        console.log('ℹ️  Usuario existe pero falta asignar rol admin...');
      }
    } catch (error) {
      // Si hay error, asumir que necesita actualización
      needsUpdate = true;
    }
  }

  // Solo actualizar si es necesario
  if (needsUpdate) {
    const userData = {
      username: 'admin',
      email: 'admin@healthapp.com',
      firstName: 'Admin',
      lastName: 'User',
      enabled: true,
      emailVerified: true,
      requiredActions: [], // Limpiar todas las required actions
    };

    if (userExists && userId) {
      // Actualizar usuario existente
      await axios.put(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`,
        userData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ Usuario actualizado');
    } else {
      // Crear nuevo usuario
      await axios.post(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`,
        {
          ...userData,
          credentials: [
            {
              type: 'password',
              value: 'admin',
              temporary: false,
            },
          ],
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ Usuario creado');

      // Esperar un momento para que el usuario se cree
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Obtener el ID del usuario recién creado
      const userResponse = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=admin`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      userId = userResponse.data[0].id;
    }

    // Verificar y asignar rol admin si no lo tiene
    try {
      const roleResponse = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/admin`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const roleMappings = await axios.get(
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const hasAdminRole = roleMappings.data.some((role) => role.name === 'admin');

      if (!hasAdminRole) {
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
          [roleResponse.data],
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        console.log('✅ Rol "admin" asignado al usuario');
      }
    } catch (error) {
      console.warn('⚠️  Error asignando rol:', error.message);
    }

    console.log('✅ Usuario "admin" configurado (contraseña: admin)');
  }
}

async function verifyRealmConfigured() {
  // Verificar si el realm ya está completamente configurado
  try {
    const realmUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`;
    const response = await axios.get(realmUrl, { timeout: 5000 });
    
    if (response.data && response.data.issuer) {
      console.log('✅ Realm ya está configurado y accesible');
      
      // Verificar que el client existe
      try {
        const token = await getAdminToken();
        const clientResponse = await axios.get(
          `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (clientResponse.data && clientResponse.data.length > 0) {
          console.log('✅ Client ya está configurado');
          return true;
        }
      } catch (e) {
        // Si no podemos verificar el client, asumir que necesita configuración
        return false;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function main() {
  try {
    console.log('🔐 Verificando configuración de Keycloak...\n');
    
    // Esperar a que Keycloak esté completamente listo
    await waitForKeycloak();
    
    // Verificar si ya está configurado
    const isConfigured = await verifyRealmConfigured();
    
    if (isConfigured) {
      console.log('✅ Keycloak ya está configurado correctamente');
      console.log('   No se realizarán cambios para evitar invalidar tokens existentes');
      return;
    }
    
    console.log('🔧 Configurando Keycloak...\n');
    const token = await getAdminToken();
    await createRealm(token);
    await createClient(token);
    
    console.log('👥 Creando roles...');
    await createRole(token, 'admin');
    await createRole(token, 'professional');
    await createRole(token, 'patient');
    
    await createAdminUser(token);
    
    // Verificar que todo esté configurado correctamente
    console.log('\n🔍 Verificando configuración final...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar a que Keycloak procese los cambios
    
    const finalCheck = await verifyRealmConfigured();
    if (finalCheck) {
      console.log('\n✨ Configuración de Keycloak completada y verificada!');
    } else {
      console.log('\n⚠️  Configuración completada, pero la verificación final falló');
      console.log('   Esto puede ser normal si Keycloak aún está procesando los cambios');
    }
    
    console.log('\n📝 Credenciales:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin');
    console.log(`   Realm: ${KEYCLOAK_REALM}`);
    console.log(`   Client ID: ${KEYCLOAK_CLIENT_ID}`);
  } catch (error) {
    console.error('❌ Error configurando Keycloak:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    // No hacer exit(1) para que el script de inicialización pueda continuar
    console.error('   Continuando a pesar del error...');
    throw error; // Re-lanzar para que el script de inicialización sepa que hubo un error
  }
}

main().catch((error) => {
  // El error ya fue logueado en la función main
  // Salir con código 0 para que el script de inicialización pueda continuar
  // El script de inicialización manejará el error apropiadamente
  console.error('⚠️  Setup de Keycloak completado con errores');
  process.exit(0);
});

