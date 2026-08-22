<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Enums;

/**
 * Natureza da experiência que o módulo entrega.
 *
 * O `kind` é o que permite ao frontend escolher o layout do shell antes de saber
 * qual componente será carregado — um explorador de dados precisa de painel
 * lateral e tabela; um artigo, de coluna de leitura.
 */
enum ModuleKind: string
{
    case Simulation = 'simulation';
    case DatasetExplorer = 'dataset_explorer';
    case Visualization = 'visualization';
    case Article = 'article';
    case Experiment = 'experiment';

    public function label(): string
    {
        return match ($this) {
            self::Simulation => 'Simulação',
            self::DatasetExplorer => 'Explorador de dados',
            self::Visualization => 'Visualização',
            self::Article => 'Artigo',
            self::Experiment => 'Experimento',
        };
    }

    /** Módulos interativos exigem um componente registrado no frontend. */
    public function requiresComponent(): bool
    {
        return $this !== self::Article;
    }
}
