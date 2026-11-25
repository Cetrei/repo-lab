# REPO Lab

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Pyodide](https://img.shields.io/badge/Pyodide-F7C948)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

Calculadoras para R.E.P.O. en una sola página: la probabilidad de cajas cosméticas por nivel, la fuerza que hace falta para levantar cada monstruo según tu equipo, el estado de la tienda de mejoras (con el almacén oculto, el void) y cuántos enemigos aparecen y cuándo vuelven.

Pruébalo en https://cetrei.github.io/repo-lab/

## Cómo funciona

Las reglas están escritas en Python y se ejecutan dentro de tu navegador con Pyodide, de modo que no hay servidor detrás. La interfaz es React y habla con el código Python a través de un contrato tipado que se prueba con los mismos casos en los dos lenguajes. Todas las cifras que usan los cálculos están en archivos YAML de la carpeta `data/`, cada una con su fuente.

## De dónde salen los datos

Las tablas de cajas vienen de la guía de FiziqR sobre el juego descompilado y de su espejo en la wiki de R.E.P.O. El método para calcular las probabilidades y el comportamiento de las mejoras salen de los videos de SiniK. La fuerza por monstruo sale de itemlevel.net, contrastada con otras tablas, y la aparición de enemigos del video de alter ego. El detalle de cada cifra, y de dónde dos fuentes se contradicen, está en `docs/DATA_SOURCES.md`.

Los datos no se actualizan solos. Si el juego cambia una regla, hay que editar el YAML correspondiente.

## Licencia

MIT.
