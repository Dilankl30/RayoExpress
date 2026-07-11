---
name: rayoexpress-testing
description: Testing y pruebas de RayoExpress con Vitest y Playwright. Usar cuando se necesite ejecutar tests, crear nuevos tests unitarios o e2e, o depurar fallos de pruebas.
---

# Skill: Testing - RayoExpress

## Frameworks de Testing

| Framework | Tipo | Comando |
|-----------|------|---------|
| **Vitest** | Unit tests | `npm run test` |
| **Playwright** | E2E tests | `npx playwright test` |
| **React Testing Library** | Componentes | (incluido en Vitest) |

## Tests Unitarios (Vitest)

### Ejecutar

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar con watch mode
npm run test -- --watch

# Ejecutar un archivo específico
npm run test -- src/modules/auth/application/auth.service.test.ts

# Con cobertura
npm run test -- --coverage
```

### Estado actual
- **160+ tests unitarios** pasando correctamente
- Tests cubren servicios, utilidades y lógica de negocio

### Convención de archivos
- Tests unitarios: `*.test.ts` o `*.test.tsx`
- Ubicación: junto al archivo que testean

### Ejemplo de test de servicio

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getStores } from './store-service';

describe('getStores', () => {
  it('debería retornar lista de tiendas', async () => {
    const stores = await getStores();
    expect(stores).toBeInstanceOf(Array);
  });
});
```

### Ejemplo de test de componente

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('debería renderizar correctamente', () => {
    render(<MyComponent />);
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });
});
```

## Tests E2E (Playwright)

### Configuración
- Archivo: `playwright.config.ts`
- Directorio: `e2e/`

### Ejecutar

```bash
# Ejecutar todos los tests e2e
npx playwright test

# Con interfaz visual
npx playwright test --ui

# Un archivo específico
npx playwright test e2e/login.spec.ts

# Generar reporte
npx playwright show-report
```

## Verificación antes de Push

Siempre ejecutar antes de hacer push a GitHub:

```bash
npm run build   # Verificar compilación
npm run test    # Verificar tests unitarios
```
