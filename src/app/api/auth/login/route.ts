import { NextResponse } from 'next/server';
import { sql } from '../../../../db/neon';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // Buscar usuário pelo e-mail
    const userResult = await sql`
      SELECT id, nome, email, senha, role 
      FROM usuarios 
      WHERE LOWER(email) = LOWER(${email.trim()})
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'Usuário não cadastrado.' }, { status: 401 });
    }

    const user = userResult[0];

    // Comparar senha plana conforme solicitado (123456)
    if (user.senha !== password) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json({ error: 'Erro ao autenticar no servidor.', details: error.message }, { status: 500 });
  }
}
