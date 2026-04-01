import logging
from typing import Any

from app.conversations.service import update_conversation, save_message
from app.leads.service import update_lead

logger = logging.getLogger(__name__)

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "salvar_nome",
            "description": "Salva o nome do lead quando descoberto durante a conversa",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nome do lead"}
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "mudar_stage",
            "description": "Transfere o lead para outro stage quando a necessidade for identificada. Usar de forma silenciosa, sem avisar o cliente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage": {
                        "type": "string",
                        "description": "Stage de destino",
                    }
                },
                "required": ["stage"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "encaminhar_humano",
            "description": "Encaminha o lead qualificado para um vendedor humano continuar o atendimento",
            "parameters": {
                "type": "object",
                "properties": {
                    "vendedor": {"type": "string", "description": "Nome do vendedor"},
                    "motivo": {"type": "string", "description": "Motivo do encaminhamento"},
                },
                "required": ["vendedor", "motivo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "enviar_fotos",
            "description": "Envia catalogo de fotos dos produtos ao lead",
            "parameters": {
                "type": "object",
                "properties": {
                    "categoria": {
                        "type": "string",
                        "description": "Categoria do catalogo",
                    }
                },
                "required": ["categoria"],
            },
        },
    },
]

_TOOLS_BY_NAME = {t["function"]["name"]: t for t in TOOLS_SCHEMA}


def get_tools_for_stage(tool_names: list[str]) -> list[dict]:
    """Return tool schemas for the given tool names."""
    return [_TOOLS_BY_NAME[name] for name in tool_names if name in _TOOLS_BY_NAME]


async def execute_tool(
    tool_name: str,
    args: dict[str, Any],
    conversation_id: str,
    lead_id: str,
) -> str:
    """Execute a tool call and return a result string for the AI."""
    logger.info(f"Executing tool {tool_name} with args {args} for conversation {conversation_id}")

    if tool_name == "salvar_nome":
        update_lead(lead_id, name=args["name"])
        return f"Nome salvo: {args['name']}"

    elif tool_name == "mudar_stage":
        new_stage = args["stage"]
        update_conversation(conversation_id, stage=new_stage)
        return f"Stage alterado para: {new_stage}"

    elif tool_name == "encaminhar_humano":
        update_conversation(conversation_id, status="converted")
        save_message(
            conversation_id, lead_id, "system",
            f"Lead encaminhado para {args['vendedor']}: {args['motivo']}",
        )
        return f"Lead encaminhado para {args['vendedor']}"

    elif tool_name == "enviar_fotos":
        categoria = args["categoria"]
        save_message(
            conversation_id, lead_id, "system",
            f"Fotos de {categoria} enviadas",
        )
        return f"Fotos de {categoria} enviadas ao lead"

    return f"Tool {tool_name} nao reconhecida"
