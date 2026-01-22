import { __html, countries, getCurrencies } from "../../helpers/global.js";

export class TabGeneral {

  constructor() {

    this.init();
  }

  init = () => {

    document.querySelector('tab-general').innerHTML = /*html*/`
        <div>
            <h4 id="h-general" class="card-title mb-4">${__html('General')}</h4>
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group row mb-3 mt-1">
                  <label class="col-sm-3 col-form-label">${__html('Brand name')}</label>
                  <div class="col-sm-9">
                    <input id="brand_name" type="text" class="form-control inp" name="brand_name" data-type="text">
                    <p class="form-text">${__html('Used for notifying users.')}</p>
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="form-group row mb-3 mt-1">
                  <label class="col-sm-3 col-form-label">${__html('Domain name')}</label>
                  <div class="col-sm-9">
                    <input id="domain_name" type="text" class="form-control inp" name="domain_name" data-type="text">
                    <p class="form-text">${__html('Domain name associated with the user account and self-service platform.')}</p>
                  </div>
                </div>
              </div>
            </div>

            <h4 id="h-pricing" class="card-title mb-4">${__html('Pricing')}</h4>
            <table class="price-table order-form mb-3">
              <thead>
                <tr><th><div class="me-1 me-sm-3">${__html('Site')}</div></th><th class="qty"><div class="me-1 me-sm-3">${__html('Code')}</div></th><th><div class="me-1 me-sm-3">${__html('Parent')}</div></th><th><div class="me-1 me-sm-3">${__html('Title')}</div></th><th class="tp"><div class="me-1 me-sm-3">${__html('Price')}</div></th><th class="tp"><div class="me-1 me-sm-3">${__html('Unit')}</div></th><th></th></tr>
                <tr class="new-item-row">
                    <td>

                    </td>
                    <td class="tp">
                        <div class="me-1 me-sm-3 mt-2">
                            <input type="text" value="" autocomplete="off" class="form-control price-id" style="max-width:100px;">
                        </div>
                    </td>
                    <td>
                        <div class="me-1 me-sm-3 mt-2">
                            <select class="form-select price-parent inp" name="price_parent" data-type="select">

                            </select>
                        </div>
                    </td>
                    <td>
                      <div class="me-1 me-sm-3 mt-2">
                          <input type="text" value="" autocomplete="off" placeholder="${__html(' ')}" class="form-control price-title" data-id="" data-index="" list="item-suggestions">
                      </div>
                    </td>
                    <td class="price">
                        <div class="me-1 me-sm-3 mt-2">
                            <input type="text" value="" autocomplete="off" class="form-control text-right price-price" style="max-width:80px;">
                        </div>
                    </td>
                    <td class="price">
                        <div class="me-1 me-sm-3 mt-2">
                          <select class="form-select price-unit inp" name="price_unit" data-type="select">
                            <option value="length">${__html('Length')}</option>
                            <option value="m2">${__html('㎡')}</option>
                            <option value="hour">${__html('Hour')}</option>
                            <option value="unit">${__html('Unit')}</option>
                          </select>
                        </div>
                    </td>
                    <td class="align-middle text-center pt-2"> 
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="24" height="24" class="bi bi-plus-circle text-success align-middle add-price po"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"></path></svg>
                    </td>
                </tr>
              </thead>
              <tbody>


              </tbody>
            </table>

            <p class="form-text">${__html('Setup price classifications')}</p>

            <input id="price" type="text" class="form-select inp d-none" name="price" data-type="text">

            <h4 id="h-discounts" class="card-title mb-4 mt-4">${__html('Discounts')}</h4>
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group row mb-3 mt-1">
                  <label class="col-sm-3 col-form-label">${__html('Visibility')}</label>
                  <div class="col-sm-9">
                    <div class="form-check">
                      <input id="discount_visibility" class="form-check-input inp" name="discount_visibility" type="checkbox" value="1" data-type="checkbox">
                      <label class="form-check-label" for="discount_visibility">
                        ${__html('Document discounts')}
                      </label>
                    </div>
                    <p class="form-text">${__html('Enable or disable discount visibility in quotations, waybills, and invoices.')}</p>
                  </div>
                </div>
              </div>
            </div>

            <h4 id="h-inventory" class="card-title mb-4 mt-4">${__html('Inventory')}</h4>
            <div class="row">
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Low stock')}</label>
                    <div class="col-sm-9">
                        <select id="notify_low_stock" class="form-select inp" name="notify_low_stock" data-type="select">
                            <option value="">${__html('None')}</option>
                            <option value="dashboard">${__html('Via dashboard')}</option>
                            <option value="email">${__html('Via email')}</option>
                            <option value="all">${__html('Via dashboard and email')}</option>
                        </select>
                        <p class="form-text">${__html('Product low stock notification settings.')}</p>
                    </div>
                  </div>
              </div>
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Emails')}</label>
                    <div class="col-sm-9">
                        <input id="notify_low_stock_emails" type="text" class="form-control inp" name="notify_low_stock_emails" data-type="emails">
                        <p class="form-text">${__html('Example: alex@kenzap.com, orders@kenzap.com')}</p>
                    </div>
                  </div>
              </div>
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('System of units')}</label>
                    <div class="col-sm-9">
                      <select id="system_of_units" class="form-select inp" name="system_of_units" data-type="select">
                        <option value="">${__html('Choose system of units')}</option>
                        <option value="metric">${__html('Metric System')}</option>
                        <option value="imperial">${__html('Imperial System')}</option>
                      </select>
                      <p class="form-text">${__html('Default measurement unit for inventory tracking.')}</p>
                    </div>
                  </div>
              </div>
            </div>

            <h4 id="h-payments" class="card-title mb-4 mt-4">${__html('Payments')}</h4>
            <div class="row">
                <div class="col-lg-6">
                <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Currency')}</label>
                    <div class="col-sm-9">
                        <select id="currency" class="form-select inp" name="currency" data-type="select">
                            <option value="">${__html('Choose currency')}</option>
                            ${getCurrencies().map(c => `<option value="${c.code}">${__html(c.name)} (${__html(c.code)})</option>`).join('')}
                        </select>
                    </div>
                </div>
                </div>
                <div class="col-lg-6">
                    <div class="form-group row mb-3 mt-1">
                        <label class="col-sm-3 col-form-label">${__html('Currency symbol')}</label>
                        <div class="col-sm-9">
                            <input id="currency_symb" type="text" class="form-select inp" name="currency_symb" value="" data-type="text">
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-lg-6">
                    <div class="form-group row mb-3 mt-1">
                        <label class="col-sm-3 col-form-label">${__html('Position')}</label>
                        <div class="col-sm-9">
                            <select id="currency_symb_loc" class="form-select inp" name="currency_symb_loc" data-type="select">
                                <option value="left">${__html('Left')}</option>
                                <option value="right">${__html('Right')}</option>
                                <option value="left_space">${__html('Left with space')}</option>
                                <option value="right_space">${__html('Right with space')}</option>
                            </select>
                            <p class="form-text">${__html('Currency position symbol.')}</p>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">

                </div>
            </div>

            <h4 id="h-tax" class="card-title mb-4 mt-4">${__html('Tax')}</h4>
            <div class="row">
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                  <label class="col-sm-3 col-form-label">${__html('Calculation')}</label>
                    <div class="col-sm-9">
                        <div class="form-check">
                          <input id="tax_percent_auto" class="form-check-input inp" name="tax_percent_auto" type="checkbox" value="1" data-type="checkbox">
                          <label class="form-check-label" for="tax_percent_auto">
                              ${__html('Auto tax rate')}
                          </label>
                        </div>
                        <p class="form-text">${__html('Automatically detect tax rate whenever applicable.')}</p>
                    </div> 
                  </div>
              </div>
            </div>
            <div class="row">
              <div class="col-lg-6">
                <div class="form-group row mb-3 mt-1">
                  <label class="col-sm-3 col-form-label">${__html('Tax region')}</label>
                  <div class="col-sm-9">
                    <select id="tax_region" class="form-select inp" name="tax_region" data-type="select">
                      <option value="">${__html('Select')}</option>
                      ${countries.map(c => `<option value="${c.code}">${__html(c.name)}</option>`).join('')}
                    </select>
                    <p class="form-text">${__html('Select the country for tax calculations and compliance.')}</p>
                  </div> 
                </div>
              </div>

              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Vat number')}</label>
                    <div class="col-sm-9">
                        <input id="vat_number" type="text" class="form-control inp" placeholder="VAT123456" name="vat_number" data-type="text">
                        <p class="form-text">${__html('Enter the VAT number for tax purposes.')}</p>
                    </div>
                  </div>
              </div>
            </div>

            <div class="row">
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Standard rate')}</label>
                    <div class="col-sm-9">
                        <input id="tax_percent" type="text" class="form-control inp" placeholder="21" name="tax_percent" data-type="text">
                        <p class="form-text">${__html('Default tax rate. Example, 9 or 21. Use numeric value.')}</p>
                    </div>
                  </div>
              </div>
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Display')}</label>
                    <div class="col-sm-9">
                        <input id="tax_display" type="text" class="form-control inp" placeholder="VAT" name="tax_display" data-type="text">
                        <p class="form-text">${__html('Tax title. Example, VAT or GST.')}</p>
                    </div>
                  </div>
              </div>
            </div>

            <h4 id="h-orders" class="card-title mb-4 mt-4">${__html('Orders')}</h4>
            <div class="row">
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Order ID')}</label>
                    <div class="col-sm-9">
                        <input id="last_order_id" type="text" class="form-control inp" name="last_order_id" data-type="text">
                        <p class="form-text">${__html('Define next new order ID number.')}</p>
                    </div>
                  </div>
              </div>
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Waybill ID')}</label>
                    <div class="col-sm-9">
                        <input id="waybill_last_number" type="text" class="form-control inp" name="waybill_last_number" data-type="text">
                        <p class="form-text">${__html('Define next new waybill ID number.')}</p>
                    </div>
                  </div>
              </div>
            </div>
            <div class="row">
              <div class="col-lg-6">
              
              </div>
              <div class="col-lg-6">
                  <div class="form-group row mb-3 mt-1">
                    <label class="col-sm-3 col-form-label">${__html('Annulled waybills')}</label>
                    <div class="col-sm-9">
                      <textarea id="waybill_anulled_list" type="text" class="form-control inp" name="waybill_anulled_list" data-type="textarea" rows="4"></textarea>
                      <p class="form-text">${__html('List of canceled waybills queued for upcoming orders.')}</p>
                    </div>
                  </div>
              </div>
            </div>
        </div>`;
  }
}