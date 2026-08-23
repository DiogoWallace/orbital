<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Catalog\Models\Tag;
use App\Domain\Editorial\Enums\PostStatus;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Enums\Role;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Os primeiros textos do blog.
 *
 * Conteúdo de verdade, e não `lorem ipsum`: um blog vazio numa plataforma
 * recém-publicada passa a impressão errada, e texto falso na home é pior que
 * página sem blog. Estes três explicam decisões que a plataforma já tomou —
 * são o material que existe sem precisar inventar nada.
 */
class PostSeeder extends Seeder
{
    public function run(): void
    {
        $autor = User::role(Role::Admin->value)->first();

        foreach ($this->posts() as $dados) {
            $tags = $dados['tags'];
            unset($dados['tags']);

            $post = Post::updateOrCreate(
                ['slug' => $dados['slug']],
                [...$dados, 'author_id' => $autor?->id],
            );

            $post->tags()->sync(
                collect($tags)->map(fn (string $nome) => Tag::firstOrCreate(
                    ['slug' => Str::slug($nome)],
                    ['name' => $nome],
                )->id)->all()
            );
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function posts(): array
    {
        return [
            [
                'slug' => 'por-que-a-simulacao-roda-no-seu-navegador',
                'title' => 'Por que a simulação roda no seu navegador',
                'excerpt' => 'Cada arrasto de slider poderia virar uma requisição ao servidor. '
                    .'Não vira — e essa decisão define como a plataforma inteira é construída.',
                'status' => PostStatus::Published,
                'published_at' => now()->subDays(9),
                'tags' => ['Arquitetura', 'Bastidores'],
                'body' => <<<'MD'
                Existe um jeito óbvio de construir uma plataforma de simulações: o
                usuário ajusta um parâmetro, o navegador manda o valor para o
                servidor, o servidor calcula, devolve o resultado, a tela atualiza.
                É assim que quase todo sistema web funciona, e é assim que o Orbital
                **não** funciona.

                ## O problema do ida e volta

                Uma simulação orbital avança em passos pequenos — tipicamente
                dezenas por segundo. Se cada passo custasse uma requisição HTTP,
                cada uma com sua latência de rede, a órbita andaria aos solavancos e
                arrastar um slider deixaria de ser exploração para virar espera.

                O ponto não é o servidor ser lento. É que a distância entre o seu
                dedo e a resposta na tela precisa ser menor do que a sua percepção
                de causa e efeito. Acima de uns cem milissegundos, o vínculo entre
                "eu mexi" e "aquilo mudou" se desfaz, e o que sobra é um formulário.

                ## Onde a física mora

                Cada módulo do Orbital guarda seu modelo físico em TypeScript puro,
                separado de qualquer código de interface:

                ```
                modules/orbital-sandbox/
                ├── simulation/     ← física: step(dt, params) → state
                ├── components/     ← React, só desenha
                └── index.ts
                ```

                A pasta `simulation/` não importa React. Não sabe que existe tela.
                Recebe um estado e um intervalo de tempo, devolve o estado seguinte.
                Isso tem três consequências práticas:

                1. **É testável de verdade.** A física roda no Vitest, sem renderizar
                   nada, comparando o resultado de uma órbita fechada com o que a
                   conservação de energia exige.
                2. **É determinística.** Passo de tempo fixo com acumulador: a mesma
                   entrada dá o mesmo resultado numa máquina rápida e numa lenta. Uma
                   simulação que muda de comportamento conforme o framerate não é
                   um experimento, é uma animação.
                3. **Cabe num Web Worker sem reescrever a interface.** No dia em que
                   um modelo pesado travar a rolagem da página, ele muda de thread e
                   a UI nem fica sabendo.

                ## O que continua no servidor

                Nem tudo desce para o navegador. Fica no Laravel o que exige
                confiança ou memória: o catálogo, as permissões, e o registro de uma
                execução que você decidiu salvar — parâmetros, versão do modelo,
                resultado. Reproduzir um resultado meses depois é papel do banco,
                não do seu navegador.

                O contrato para simulação no servidor existe desde o começo, e está
                deliberadamente **sem implementações**. Ele entra quando aparecer um
                modelo que o navegador não aguente, ou um dado que não deva ser
                enviado ao cliente. Até lá, o ponto de extensão está pronto e o
                código não foi escrito — que é o estado certo para uma abstração de
                que ainda não se precisou.
                MD,
            ],
            [
                'slug' => 'o-que-as-cores-do-james-webb-querem-dizer',
                'title' => 'O que as cores do James Webb querem dizer',
                'excerpt' => 'O telescópio enxerga no infravermelho, que é invisível para nós. '
                    .'Toda cor que você vê nessas imagens é uma decisão de tradução.',
                'status' => PostStatus::Published,
                'published_at' => now()->subDays(4),
                'cover_path' => '/webb/carina-cosmic-cliffs.webp',
                'cover_credit' => 'NASA, ESA, CSA, and STScI',
                'cover_source' => 'https://esawebb.org/images/weic2205a/',
                'tags' => ['Astronomia', 'Visualização'],
                'body' => <<<'MD'
                A pergunta aparece toda vez que uma imagem nova do James Webb
                circula: *a cor é real?* A resposta honesta é que a pergunta está mal
                colocada — e desmontá-la explica mais sobre o telescópio do que
                qualquer resposta curta.

                ## O olho humano é um instrumento estreito

                Enxergamos uma faixa de luz que vai de mais ou menos 380 a 700
                nanômetros de comprimento de onda. É uma fatia fininha do espectro
                eletromagnético, e não há nada de especial nela além de ser a que
                nossa biologia calhou de usar.

                O Webb foi construído para outra faixa: o infravermelho, de cerca de
                0,6 até 28 micrômetros. Isso não é capricho de engenharia. Duas
                razões físicas mandam:

                - **A poeira atrapalha menos.** Luz visível é espalhada pelos grãos
                  de poeira que enchem as regiões de formação estelar. O
                  infravermelho atravessa. É por isso que o Webb mostra estrelas
                  recém-nascidas dentro dos pilares onde o Hubble via silhueta.
                - **O universo distante está deslocado para o vermelho.** A expansão
                  do espaço estica a luz que viaja por ele. A luz visível emitida
                  por uma galáxia muito antiga chega aqui como infravermelho. Para
                  ver o começo, é preciso olhar nessa faixa.

                Nada disso o olho alcança. Não existe "como seria de verdade": não
                há um jeito de estar lá e ver aquilo.

                ## Da medida para a imagem

                O detector não registra cor. Registra **quantidade de luz que passou
                por um filtro**, e cada filtro deixa passar uma faixa estreita de
                comprimentos de onda. Uma imagem divulgada costuma combinar várias
                dessas exposições.

                A convenção para juntá-las é simples e quase sempre a mesma:
                ordenar os filtros por comprimento de onda e atribuir cores na mesma
                ordem em que o olho as vê. O filtro mais curto vira azul, o mais
                longo vira vermelho, os do meio se distribuem entre eles.

                Isso preserva a informação que importa. Quando você olha uma imagem
                do Webb e vê uma região avermelhada, está vendo material que emite
                mais no comprimento de onda longo — mais frio, ou mais encoberto por
                poeira. O azul indica o oposto. **A cor é um eixo de dados
                desenhado**, não um enfeite: ela carrega a mesma relação de ordem que
                o instrumento mediu.

                ## Por que isso tem a ver com o Orbital

                É exatamente o que um gráfico faz. Um eixo vertical não é a altitude:
                é a altitude traduzida em pixels, por uma escala que alguém escolheu.
                Uma escala mal escolhida esconde o que importa; uma escala honesta
                deixa o dado falar.

                As imagens do Webb são a versão mais bonita desse mesmo trabalho —
                e a mais fácil de esquecer que é trabalho. Toda visualização desta
                plataforma faz a mesma travessia, de número para forma. A diferença
                é que ninguém pergunta se a cor do gráfico é real.
                MD,
            ],
            [
                'slug' => 'o-paradoxo-de-acelerar-em-orbita',
                'title' => 'O paradoxo de acelerar em órbita',
                'excerpt' => 'Para alcançar algo que está à sua frente na mesma órbita, acelerar '
                    .'é a pior coisa a fazer. A intuição de trânsito não vale aqui.',
                'status' => PostStatus::Published,
                'published_at' => now()->subDay(),
                'tags' => ['Física', 'Mecânica orbital'],
                'body' => <<<'MD'
                Você está numa nave e quer alcançar uma estação que está alguns
                quilômetros à frente, na mesma órbita circular. A intuição de
                motorista diz: acelere. Ela está errada — e o motivo é uma das
                lições mais úteis de mecânica orbital.

                ## O que acelerar faz de verdade

                Numa órbita, sua velocidade e sua altitude estão amarradas. Numa
                órbita circular de raio $r$ ao redor de um corpo de massa $M$:

                $$
                v = \sqrt{\frac{GM}{r}}
                $$

                Quanto mais alto, **mais devagar** — o oposto do que a palavra
                "acelerar" sugere. E o tempo para dar uma volta cresce com o
                tamanho da órbita:

                $$
                T = 2\pi\sqrt{\frac{a^{3}}{GM}}
                $$

                onde $a$ é o semieixo maior. Aqui está a armadilha. Quando você
                acelera na direção do movimento, não anda mais rápido pela órbita:
                você **eleva o lado oposto da órbita**. A trajetória circular vira
                uma elipse cujo ponto mais alto fica do outro lado do corpo central.
                O semieixo maior cresce, e com ele o período.

                Meia volta depois, você está mais alto que a estação, andando mais
                devagar que ela, e mais atrás do que quando começou.

                ## O que funciona

                Frear. Um impulso contra o movimento derruba o lado oposto da
                órbita, encolhe o semieixo maior e encurta o período. Você passa a
                dar voltas mais rápido que a estação e, depois de uma ou mais
                órbitas, chega por baixo e à frente dela. Aí sim, um impulso para
                subir circulariza a órbita na altura certa.

                A regra que sai daí é contraintuitiva e vale a pena guardar:

                > Para alcançar quem está à frente, freie. Para deixar passar quem
                > vem atrás, acelere.

                ## Por que isto é difícil de aprender lendo

                Você acabou de ler a explicação inteira. Se ela fizer sentido agora,
                vai fazer menos daqui a uma semana, porque a intuição de trânsito
                continua lá e é mais antiga.

                O que muda isso é mexer. No laboratório orbital da plataforma, dê um
                impulso prógrado numa órbita circular e acompanhe a nave por uma
                volta inteira: dá para ver a elipse se abrir, o ponto alto se formar
                do outro lado, e a estação escapar para longe justamente porque você
                acelerou. Ver uma vez custa trinta segundos e sobrevive melhor que
                qualquer parágrafo.
                MD,
            ],
        ];
    }
}
