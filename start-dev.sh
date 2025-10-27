#!/bin/bash

# Script de inicio para desarrollo local
# Reserva de Turnos API - Arquitectura BFF + Microservicios

echo "🏥 Iniciando Reserva de Turnos API - Arquitectura BFF + Microservicios"
echo "=================================================================="

# Verificar si Docker está ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor, inicia Docker Desktop."
    exit 1
fi

echo "✅ Docker está ejecutándose"

# Crear archivos .env si no existen
echo "📝 Configurando variables de entorno..."

# BFF
if [ ! -f bff/.env ]; then
    echo "📝 Creando .env para BFF..."
    cat > bff/.env << EOF
NODE_ENV=development
PORT=3000
PATIENTS_SERVICE_URL=http://localhost:3001
PROFESSIONALS_SERVICE_URL=http://localhost:3002
APPOINTMENTS_SERVICE_URL=http://localhost:3003
EOF
fi

# Patients Service
if [ ! -f services/patients/.env ]; then
    echo "📝 Creando .env para Patients Service..."
    cat > services/patients/.env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/reserva_turnos_db?schema=public
EOF
fi

# Professionals Service
if [ ! -f services/professionals/.env ]; then
    echo "📝 Creando .env para Professionals Service..."
    cat > services/professionals/.env << EOF
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://postgres:password@localhost:5432/reserva_turnos_db?schema=public
EOF
fi

# Appointments Service
if [ ! -f services/appointments/.env ]; then
    echo "📝 Creando .env para Appointments Service..."
    cat > services/appointments/.env << EOF
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://postgres:password@localhost:5432/reserva_turnos_db?schema=public
EOF
fi

echo "✅ Variables de entorno configuradas"

# Iniciar PostgreSQL con Docker Compose
echo "🐳 Iniciando PostgreSQL..."
docker-compose up -d postgres

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 15

# Verificar si PostgreSQL está funcionando
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "❌ Error: PostgreSQL no se inició correctamente"
    echo "📋 Logs de PostgreSQL:"
    docker-compose logs postgres
    exit 1
fi

echo "✅ PostgreSQL está ejecutándose"

# Instalar dependencias para cada servicio
echo "📦 Instalando dependencias..."

# BFF
echo "📦 Instalando dependencias para BFF..."
cd bff
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi
cd ..

# Patients Service
echo "📦 Instalando dependencias para Patients Service..."
cd services/patients
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi
cd ../..

# Professionals Service
echo "📦 Instalando dependencias para Professionals Service..."
cd services/professionals
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi
cd ../..

# Appointments Service
echo "📦 Instalando dependencias para Appointments Service..."
cd services/appointments
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi
cd ../..

echo "✅ Dependencias instaladas"

# Generar clientes de Prisma para cada servicio
echo "🔧 Generando clientes de Prisma..."

echo "🔧 Generando cliente para Patients Service..."
cd services/patients
npx prisma generate
cd ../..

echo "🔧 Generando cliente para Professionals Service..."
cd services/professionals
npx prisma generate
cd ../..

echo "🔧 Generando cliente para Appointments Service..."
cd services/appointments
npx prisma generate
cd ../..

echo "✅ Clientes de Prisma generados"

# Ejecutar migraciones de Prisma para cada servicio
echo "🗄️ Ejecutando migraciones de Prisma..."

echo "🗄️ Migraciones para Patients Service..."
cd services/patients
npx prisma db push
cd ../..

echo "🗄️ Migraciones para Professionals Service..."
cd services/professionals
npx prisma db push
cd ../..

echo "🗄️ Migraciones para Appointments Service..."
cd services/appointments
npx prisma db push
cd ../..

echo "✅ Migraciones ejecutadas"

echo ""
echo "🎉 ¡Servicios iniciados exitosamente!"
echo ""
echo "📋 Información de los servicios:"
echo "   🗄️ PostgreSQL: localhost:5432"
echo "   🚀 BFF Service: http://localhost:3000"
echo "   👤 Patients Service: http://localhost:3001"
echo "   👨‍⚕️ Professionals Service: http://localhost:3002"
echo "   📅 Appointments Service: http://localhost:3003"
echo ""
echo "📚 Endpoints principales (a través del BFF):"
echo "   👤 Pacientes: http://localhost:3000/api/v1/patients"
echo "   👨‍⚕️ Profesionales: http://localhost:3000/api/v1/professionals"
echo "   📅 Turnos: http://localhost:3000/api/v1/appointments"
echo ""
echo "🔧 Comandos útiles:"
echo "   📊 Ver base de datos: npx prisma studio"
echo "   🐳 Ver logs: docker-compose logs -f"
echo "   🛑 Detener servicios: docker-compose down"
echo ""
echo "🚀 Para iniciar los servicios en modo desarrollo:"
echo "   # Terminal 1 - BFF"
echo "   cd bff && npm run dev"
echo ""
echo "   # Terminal 2 - Patients Service"
echo "   cd services/patients && npm run dev"
echo ""
echo "   # Terminal 3 - Professionals Service"
echo "   cd services/professionals && npm run dev"
echo ""
echo "   # Terminal 4 - Appointments Service"
echo "   cd services/appointments && npm run dev"
echo ""
echo "🏥 Health Checks:"
echo "   BFF: http://localhost:3000/health"
echo "   Patients: http://localhost:3001/health"
echo "   Professionals: http://localhost:3002/health"
echo "   Appointments: http://localhost:3003/health"
