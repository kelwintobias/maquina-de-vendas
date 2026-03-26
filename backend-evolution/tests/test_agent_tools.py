from app.agent.tools import get_tools_for_stage, PHOTO_CAPTIONS


def test_secretaria_tools():
    tools = get_tools_for_stage("secretaria")
    names = [t["function"]["name"] for t in tools]
    assert "salvar_nome" in names
    assert "mudar_stage" in names
    assert "encaminhar_humano" not in names


def test_atacado_tools():
    tools = get_tools_for_stage("atacado")
    names = [t["function"]["name"] for t in tools]
    assert "salvar_nome" in names
    assert "encaminhar_humano" in names
    assert "enviar_fotos" in names


def test_consumo_tools():
    tools = get_tools_for_stage("consumo")
    names = [t["function"]["name"] for t in tools]
    assert names == ["salvar_nome"]


def test_photo_captions_exist_for_atacado():
    assert "atacado" in PHOTO_CAPTIONS
    captions = PHOTO_CAPTIONS["atacado"]
    assert len(captions) == 5
    assert "foto_1" in captions
    assert "Classico" in captions["foto_1"]


def test_photo_captions_exist_for_private_label():
    assert "private_label" in PHOTO_CAPTIONS
    captions = PHOTO_CAPTIONS["private_label"]
    assert len(captions) == 4
    assert "foto_1" in captions
