import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { tenantAuthMiddleware as authMiddleware } from './tenant-auth-middleware.ts';
import { logActivity } from './audit-logger.ts';

const shareRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

const CreateShareSchema = z.object({
  inspection_id: z.number(),
  permission: z.enum(['view', 'edit']),
  expires_at: z.string().optional()
});

const UpdateShareResponsesSchema = z.object({
  responses: z.array(z.object({
    field_id: z.number(),
    field_name: z.string(),
    field_type: z.string(),
    value: z.any(),
    comment: z.string().optional()
  }))
});

// Helper function to generate a simple QR code as SVG (browser-compatible)
function generateQRCodeSVG(text: string, size = 200): string {
  // Simple QR code placeholder as SVG
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="10" y="10" width="180" height="180" fill="none" stroke="#000000" stroke-width="2"/>
      <text x="${size / 2}" y="${size / 2 - 10}" text-anchor="middle" font-family="Arial" font-size="12" fill="#000000">
        QR Code
      </text>
      <text x="${size / 2}" y="${size / 2 + 10}" text-anchor="middle" font-family="Arial" font-size="8" fill="#666666">
        ${text.length > 30 ? text.substring(0, 27) + '...' : text}
      </text>
    </svg>
  `;
}

// Create share link for inspection
shareRoutes.post('/:id/share', authMiddleware, async (c) => {
  const inspectionId = parseInt(c.req.param('id'));
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 401);
  }

  const body = await c.req.json();
  const { permission = 'view', expires_at } = body;

  // Generate unique share token
  const shareToken = Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  try {
    const result = await c.env.DB.prepare(`
      INSERT INTO inspection_shares (
        inspection_id, share_token, created_by, permission, expires_at, 
        is_active, access_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      inspectionId,
      shareToken,
      user.id,
      permission,
      expires_at || null,
      true,
      0
    ).run();

    // Generate share URL and QR Code
    const shareUrl = `${c.req.header('origin') || 'https://localhost'}/shared/${shareToken}`;
    const qrCodeSVG = generateQRCodeSVG(shareUrl);
    const qrCodeBase64 = `data:image/svg+xml;base64,${btoa(qrCodeSVG)}`;

    // Log Activity (Async)
    await logActivity(c.env, {
      userId: user.id,
      orgId: user.organization_id || null, // Best effort
      actionType: 'SHARE',
      actionDescription: `Inspection Shared: ${inspectionId}`,
      targetType: 'INSPECTION',
      targetId: inspectionId,
      metadata: { share_token: shareToken, permission },
      req: c.req
    });

    return c.json({
      id: result.meta.last_row_id,
      share_token: shareToken,
      share_url: shareUrl,
      qr_code: qrCodeBase64,
      message: 'Link de compartilhamento criado com sucesso'
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return c.json({ error: 'Erro ao criar link de compartilhamento' }, 500);
  }
});

// Get share links for inspection
shareRoutes.get('/:id/shares', authMiddleware, async (c) => {
  const inspectionId = parseInt(c.req.param('id'));

  const shares = await c.env.DB.prepare(`
    SELECT * FROM inspection_shares 
    WHERE inspection_id = ? 
    ORDER BY created_at DESC
  `).bind(inspectionId).all();

  return c.json({ shares: shares.results });
});

// Create share link (new endpoint)
shareRoutes.post('/create', zValidator('json', CreateShareSchema), authMiddleware, async (c) => {
  const { inspection_id, permission, expires_at } = c.req.valid('json');

  try {
    // Generate unique token
    const token = self.crypto.randomUUID();

    // Set expiration (default 30 days)
    const expirationDate = expires_at ? new Date(expires_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get current user
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Usuário não autenticado' }, 401);
    }

    // Create share record
    await c.env.DB.prepare(`
      INSERT INTO inspection_shares 
      (inspection_id, share_token, created_by, permission, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      inspection_id,
      token,
      user.id,
      permission,
      expirationDate.toISOString()
    ).run();

    // Generate share URL
    const baseUrl = c.req.header('origin') || 'https://localhost';
    const shareUrl = `${baseUrl}/shared/${token}`;

    // Generate QR code as SVG
    const qrCodeSVG = generateQRCodeSVG(shareUrl);

    // Convert SVG to base64 data URL
    const qrCodeBase64 = `data:image/svg+xml;base64,${btoa(qrCodeSVG)}`;

    // Log Activity (Async)
    await logActivity(c.env, {
      userId: user.id,
      orgId: user.organization_id || null,
      actionType: 'SHARE',
      actionDescription: `Inspection Shared (New): ${inspection_id}`,
      targetType: 'INSPECTION',
      targetId: inspection_id,
      metadata: { share_token: token, permission },
      req: c.req
    });

    return c.json({
      success: true,
      share: {
        token,
        url: shareUrl,
        qr_code: qrCodeBase64,
        permission,
        expires_at: expirationDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating share:', error);
    return c.json({ error: 'Erro ao criar compartilhamento' }, 500);
  }
});

// Get shared inspection
shareRoutes.get('/:token', async (c) => {
  const token = c.req.param('token');

  try {
    // Get share record
    const shareResult = await c.env.DB.prepare(`
      SELECT * FROM inspection_shares 
      WHERE share_token = ? AND is_active = true
    `).bind(token).first();

    if (!shareResult) {
      return c.json({ error: 'Link não encontrado' }, 404);
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(shareResult.expires_at as string);

    if (expiresAt < now) {
      return c.json({
        error: 'Link expirado',
        expired: true
      }, 410);
    }

    // Get inspection details
    const inspection = await c.env.DB.prepare(`
      SELECT i.*, u.name as inspector_name, u.email as inspector_email
      FROM inspections i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `).bind(shareResult.inspection_id).first();

    if (!inspection) {
      return c.json({ error: 'Inspeção não encontrada' }, 404);
    }

    // Get inspection items
    const items = await c.env.DB.prepare(`
      SELECT * FROM inspection_items 
      WHERE inspection_id = ?
      ORDER BY id
    `).bind(shareResult.inspection_id).all();

    // Get inspection media
    const media = await c.env.DB.prepare(`
      SELECT * FROM inspection_media 
      WHERE inspection_id = ?
      ORDER BY id
    `).bind(shareResult.inspection_id).all();

    return c.json({
      success: true,
      share: shareResult,
      inspection,
      items: items.results || [],
      media: media.results || []
    });

  } catch (error) {
    console.error('Error getting shared inspection:', error);
    return c.json({ error: 'Erro ao carregar inspeção' }, 500);
  }
});

// Get share details (for QR code generation, etc.)
shareRoutes.get('/:token/details', async (c) => {
  const token = c.req.param('token');

  try {
    const shareResult = await c.env.DB.prepare(`
      SELECT s.*, i.title as inspection_title, u.name as inviter_name,
             org.name as organization_name
      FROM inspection_shares s
      JOIN inspections i ON s.inspection_id = i.id
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN organizations org ON i.organization_id = org.id
      WHERE s.share_token = ? AND s.is_active = true
    `).bind(token).first();

    if (!shareResult) {
      return c.json({ error: 'Share não encontrado' }, 404);
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(shareResult.expires_at as string);

    if (expiresAt < now) {
      return c.json({
        error: 'Link expirado',
        expired: true
      }, 410);
    }

    return c.json({
      success: true,
      share: shareResult
    });

  } catch (error) {
    console.error('Error getting share details:', error);
    return c.json({ error: 'Erro ao carregar detalhes do compartilhamento' }, 500);
  }
});

// Track access
shareRoutes.post('/:token/access', async (c) => {
  const token = c.req.param('token');

  try {
    await c.env.DB.prepare(`
      UPDATE inspection_shares 
      SET access_count = access_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE share_token = ? AND is_active = true
    `).bind(token).run();

    return c.json({ success: true });

  } catch (error) {
    console.error('Error tracking access:', error);
    return c.json({ error: 'Erro ao registrar acesso' }, 500);
  }
});

// Update shared inspection responses (for edit permission)
shareRoutes.post('/:token/responses', zValidator('json', UpdateShareResponsesSchema), async (c) => {
  const token = c.req.param('token');
  const { responses } = c.req.valid('json');

  try {
    // Get share record and check permissions
    const shareResult = await c.env.DB.prepare(`
      SELECT * FROM inspection_shares 
      WHERE share_token = ? AND is_active = true AND permission = 'edit'
    `).bind(token).first();

    if (!shareResult) {
      return c.json({ error: 'Permissão insuficiente ou link inválido' }, 403);
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(shareResult.expires_at as string);

    if (expiresAt < now) {
      return c.json({ error: 'Link expirado' }, 410);
    }

    const inspectionId = shareResult.inspection_id as number;

    // Update responses in inspection_items
    for (const response of responses) {
      // Check if item already exists
      const existingItem = await c.env.DB.prepare(`
        SELECT id FROM inspection_items 
        WHERE inspection_id = ? AND template_id IS NOT NULL 
        AND JSON_EXTRACT(field_responses, '$.field_id') = ?
      `).bind(inspectionId, response.field_id).first();

      const fieldData = {
        field_id: response.field_id,
        field_type: response.field_type,
        response_value: response.value,
        comment: response.comment,
        is_required: false
      };

      if (existingItem) {
        // Update existing item
        await c.env.DB.prepare(`
          UPDATE inspection_items 
          SET field_responses = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          JSON.stringify(fieldData),
          existingItem.id
        ).run();
      } else {
        // Create new item
        await c.env.DB.prepare(`
          INSERT INTO inspection_items 
          (inspection_id, category, item_description, field_responses, template_id)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          inspectionId,
          'Template Response',
          response.field_name,
          JSON.stringify(fieldData),
          1 // Placeholder template ID
        ).run();
      }
    }

    // Update inspection status
    await c.env.DB.prepare(`
      UPDATE inspections 
      SET status = 'em_andamento', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(inspectionId).run();

    return c.json({ success: true });

  } catch (error) {
    console.error('Error updating responses:', error);
    return c.json({ error: 'Erro ao salvar respostas' }, 500);
  }
});

// List shares for an inspection (legacy endpoint)
shareRoutes.get('/inspection/:id', authMiddleware, async (c) => {
  const inspectionId = parseInt(c.req.param('id'));
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Usuário não autenticado' }, 401);
  }

  try {
    const shares = await c.env.DB.prepare(`
      SELECT s.*, u.name as created_by_name
      FROM inspection_shares s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.inspection_id = ? AND s.is_active = true
      ORDER BY s.created_at DESC
    `).bind(inspectionId).all();

    return c.json({
      success: true,
      shares: shares.results || []
    });

  } catch (error) {
    console.error('Error listing shares:', error);
    return c.json({ error: 'Erro ao carregar compartilhamentos' }, 500);
  }
});

// Update share link
shareRoutes.put('/inspection-shares/:id', authMiddleware, async (c) => {
  const shareId = parseInt(c.req.param('id'));
  const body = await c.req.json();

  const { is_active, expires_at } = body;

  await c.env.DB.prepare(`
    UPDATE inspection_shares 
    SET is_active = ?, expires_at = ?, updated_at = NOW()
    WHERE id = ?
  `).bind(is_active, expires_at, shareId).run();

  return c.json({ message: 'Link de compartilhamento atualizado com sucesso' });
});

// Deactivate share
shareRoutes.delete('/:token', authMiddleware, async (c) => {
  const token = c.req.param('token');
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Usuário não autenticado' }, 401);
  }

  try {
    // Check if user owns this share or has permission to manage it
    const shareResult = await c.env.DB.prepare(`
      SELECT s.*, i.created_by as inspection_owner
      FROM inspection_shares s
      JOIN inspections i ON s.inspection_id = i.id
      WHERE s.share_token = ?
    `).bind(token).first();

    if (!shareResult) {
      return c.json({ error: 'Compartilhamento não encontrado' }, 404);
    }

    if (shareResult.created_by !== user.id && shareResult.inspection_owner !== user.id) {
      return c.json({ error: 'Permissão insuficiente' }, 403);
    }

    // Deactivate share
    await c.env.DB.prepare(`
      UPDATE inspection_shares 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE share_token = ?
    `).bind(token).run();

    return c.json({ success: true });

    // Log Deactivation (Async)
    logActivity(c.env, {
      userId: user.id,
      orgId: user.organization_id,
      actionType: 'UNSHARE',
      actionDescription: `Inspection Share Deactivated`,
      targetType: 'INSPECTION',
      targetId: shareResult.inspection_id,
      metadata: { token },
      req: c.req
    });

  } catch (error) {
    console.error('Error deactivating share:', error);
    return c.json({ error: 'Erro ao desativar compartilhamento' }, 500);
  }
});

// Delete share link
shareRoutes.delete('/inspection-shares/:id', authMiddleware, async (c) => {
  const shareId = parseInt(c.req.param('id'));

  await c.env.DB.prepare(`
    DELETE FROM inspection_shares WHERE id = ?
  `).bind(shareId).run();

  return c.json({ message: 'Link de compartilhamento excluído com sucesso' });

  // Log Deletion (Async) - Note: User might not be available in context for this admin route easily if middleware doesn't set it perfectly? Middleware writes to c.get('user').
  // We can try to get user.
  const user = c.get('user');
  if (user) {
    logActivity(c.env, {
      userId: user.id,
      orgId: user.organization_id,
      actionType: 'UNSHARE', // Admin delete
      actionDescription: `Inspection Share Deleted: ${shareId}`,
      targetType: 'INSPECTION_SHARE',
      targetId: shareId,
      req: c.req
    });
  }
});

export default shareRoutes;

