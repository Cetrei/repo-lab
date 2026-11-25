# Contribuir

Todas las cifras que usan las calculadoras están en `data/*.yaml`, separadas del código. Si el juego cambió una regla, lo normal es editar un YAML, con la fuente anotada en el mismo archivo, y no tocar Python.

Antes de abrir un pull request, corre las pruebas de Python con `uv run python -m unittest discover -s libs/repo_core/tests -t libs/repo_core/tests` y, si tocaste la web, `npm test` y `npm run build` desde la raíz. Los commits siguen Conventional Commits y los revisa commitlint; `sh scripts/install-git-hooks.sh` instala el hook.
