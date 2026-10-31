migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    if (!col.fields.getByName('arrival_time')) {
      col.fields.add(new DateField({ name: 'arrival_time' }))
    }
    if (!col.fields.getByName('payment_status')) {
      col.fields.add(
        new SelectField({
          name: 'payment_status',
          values: ['Pendente', 'Pago', 'Cortesia', 'Convenio', 'Parcial'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('financial_transaction_id')) {
      col.fields.add(new TextField({ name: 'financial_transaction_id' }))
    }
    if (!col.fields.getByName('procedure_id')) {
      col.fields.add(new TextField({ name: 'procedure_id' }))
    }
    app.save(col)
  },
  (app) => {
    // down
  },
)
