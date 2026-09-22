<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Runs after the app is loaded and before RefreshDatabase wipes the database.
     * Stop right away if we are not on the test database.
     */
    protected function setUpTraits()
    {
        $database = config('database.connections.pgsql.database');

        if ($database !== 'ecommerce_test') {
            $this->fail("Tests must use the ecommerce_test database, not [{$database}]. Check phpunit.xml.");
        }

        return parent::setUpTraits();
    }
}
