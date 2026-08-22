<?php

declare(strict_types=1);

it('não vaza detalhes internos no 404 quando o debug está desligado', function () {
    // Em produção `app.debug` é falso; o teste força esse cenário porque é
    // justamente nele que a mensagem crua do framework vazaria o namespace
    // completo do model.
    config()->set('app.debug', false);

    $response = $this->getJson('/api/v1/modules/nao-existe')->assertNotFound();

    expect($response->json('detail'))
        ->not->toContain('App\\')
        ->not->toContain('Model');
});

it('descreve erro de validação com os campos que falharam', function () {
    $this->postJson('/api/v1/auth/login', ['email' => 'nao-e-email'])
        ->assertStatus(422)
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('title', 'Dados inválidos')
        ->assertJsonStructure(['errors' => ['email', 'password']]);
});
