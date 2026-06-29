import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

// GET: Listar todos os usuários cadastrados (para o painel de gerenciamento)
export async function GET() {
  try {
    const users = await sql`
      SELECT id, nome, email, senha, role 
      FROM usuarios 
      ORDER BY email ASC
    `;
    
    return NextResponse.json({ users }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro ao conectar com Neon DB', details: error.message }, { status: 500 });
  }
}

// POST: Cadastrar um novo usuário no banco de dados
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, password, role } = body;

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const emailTrim = email.trim().toLowerCase();
    const userRole = role || 'operador';

    // Verificar se já existe
    const exists = await sql`
      SELECT id FROM usuarios WHERE LOWER(email) = ${emailTrim}
    `;

    if (exists.length > 0) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 });
    }

    // Inserir novo usuário
    await sql`
      INSERT INTO usuarios (nome, email, senha, role) 
      VALUES (${nome.trim()}, ${emailTrim}, ${password}, ${userRole})
    `;

    return NextResponse.json({ success: true, message: 'Usuário cadastrado com sucesso!' }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json({ error: 'Erro ao criar usuário no Neon DB', details: error.message }, { status: 500 });
  }
}

// DELETE: Excluir um usuário
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const userId = parseInt(id);

    // Evitar que o admin principal (ID 1) seja deletado acidentalmente
    if (userId === 1) {
      return NextResponse.json({ error: 'O usuário administrador principal não pode ser excluído.' }, { status: 400 });
    }

    await sql`
      DELETE FROM usuarios WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso!' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ error: 'Erro ao excluir usuário no Neon DB', details: error.message }, { status: 500 });
  }
}
