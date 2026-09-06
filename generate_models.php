<?php

$models = [
    'BusinessUnit' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'BusinessUnitMember' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'Customer' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'CustomerPic' => "",
    'Brand' => "",
    'Product' => "protected \$primaryKey = 'sku'; protected \$keyType = 'string'; public \$incrementing = false;",
    'CompanyBankAccount' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'RolePermission' => "",
    'SystemSetting' => "protected \$primaryKey = 'key'; protected \$keyType = 'string'; public \$incrementing = false;",
    'Quotation' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'QuotationItem' => "",
    'QuotationSalesNote' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'SalesOrder' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'SalesOrderItem' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'SalesOrderCost' => "protected \$keyType = 'string'; public \$incrementing = false;",
    'ActivityLog' => "",
    'Notification' => "protected \$keyType = 'string'; public \$incrementing = false;",
];

foreach ($models as $model => $config) {
    $content = "<?php\n\nnamespace App\Models;\n\nuse Illuminate\Database\Eloquent\Model;\n\nclass {$model} extends Model\n{\n    protected \$guarded = [];\n    {$config}\n}\n";
    file_put_contents(__DIR__ . "/app/Models/{$model}.php", $content);
}
echo "Models generated.\n";
