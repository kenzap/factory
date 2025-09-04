import { __html, getCurrencies } from "../helpers/global.js";

export const getHtml = () => {

  return /*html*/`
    <div class="container p-edit">
        <div class="d-md-flex justify-content-between bd-highlight mb-3">
            <nav class="bc" aria-label="breadcrumb"></nav>
            <button class="btn btn-primary btn-save mt-3 mb-1 mt-md-0 mb-md-0" type="button">${__html('Save changes')}</button>
        </div>
        <div class="row">
            <div class="col-md-12 grid-margin grid-margin-lg-0 grid-margin-md-0 stretch-card">
              <div class="card border-white shadow-sm p-sm-3 ">
                <nav class="nav tab-content mb-4" role="tablist">
                    <div class="nav nav-tabs" id="nav-tab" role="tablist">
                        <a class="nav-link active" id="nav-general-link" data-bs-toggle="tab" data-bs-target="#nav-general" type="button" role="tab" aria-controls="nav-general" aria-selected="true" href="#">${__html('General')}</a>
                        <a class="nav-link" id="nav-templates-link" data-bs-toggle="tab" data-bs-target="#nav-templates" type="button" role="tab" aria-controls="nav-templates" aria-selected="true" href="#">${__html('Templates')}</a>
                    </div>
                </nav>
                <div class="card-body tab-content" id="nav-tabContent">
                  <div class="tab-pane fade show active" id="nav-general" role="tabpanel" aria-labelledby="nav-general-link">
                    <h4 id="h-templates-general" class="card-title mb-4">${__html('General')}</h4>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Brand Name')}</label>
                          <div class="col-sm-9">
                            <input id="brand_name" type="text" class="form-control inp" name="brand_name" data-type="text">
                            <p class="form-text">${__html('Used for notifying users.')}</p>
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Domain Name')}</label>
                          <div class="col-sm-9">
                            <input id="domain_name" type="text" class="form-control inp" name="domain_name" data-type="text">
                            <p class="form-text">${__html('Domain name associated with the user account and self-service platform.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 id="coatmat" class="card-title mb-4">${__html('Variables')}</h4>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Parent')}</label>
                          <div class="col-sm-9">
                            <textarea id="var_parent" class="form-control inp" name="var_parent" rows="6" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                            <p class="form-text">${__html('Provide one coating price variable name per line')}</p>
                          </div> 
                        </div>
                      </div>
          
                      <div class="col-lg-6">
                        <groups-control></groups-control>
                      </div>
                    </div>
                    <h4 id="pricing" class="card-title mb-4">${__html('Pricing')}</h4>
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

                    <h4 id="gen" class="card-title mb-4 mt-4">${__html('Discounts')}</h4>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Coupons')}</label>
                          <div class="col-sm-9">
                            <div class="form-check">
                              <input id="coupons" class="form-check-input inp" name="coupons" type="checkbox" value="1" data-type="checkbox">
                              <label class="form-check-label" for="coupons">
                                ${__html('Enable coupons')}
                              </label>
                            </div>
                            <p class="form-text">${__html('Allow use of coupons upon checkout.')}</p>
                          </div> 
                        </div>
                      </div>
          
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('List of coupons')}</label>
                          <div class="col-sm-9">
                            <textarea id="coupon_list" class="form-control inp" name="coupon_list" rows="2" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                            <p class="form-text">${__html('Provide one coupon and its discount rate per line. Example: BESTDEALS 15.')}</p>
                          </div> 
                        </div>
                      </div>
                    </div>

                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Products')}</label>
                          <div class="col-sm-9">
                            <div class="form-check">
                              <input id="product_discounts" class="form-check-input inp" name="product_discounts" type="checkbox" value="1" data-type="checkbox">
                              <label class="form-check-label" for="product_discounts">
                                ${__html('Product discounts')}
                              </label>
                            </div>
                            <p class="form-text">${__html('Enable or disable all discounts defined under individual products page.')}</p>
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6 d-none">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('List of hours')}</label>
                          <div class="col-sm-9">
                            <textarea id="happy_hours_list" class="form-control inp" name="happy_hours_list" rows="2" data-type="text" style="font-size:13px;font-family: monospace;"></textarea>
                            <p class="form-text">${__html('Provide one happy hour, its discount per line. Example: Monday 15:00-17:30 10.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 id="gen" class="card-title mb-4 mt-4">${__html('Inventory')}</h4>
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

                    <h4 id="h-currency" class="card-title mb-4 mt-4">${__html('Payments')}</h4>
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
                            <label class="col-sm-3 col-form-label">${__html('Tax')}</label>
                            <div class="col-sm-9">
                                <div class="form-check">
                                  <input id="tax_calc" class="form-check-input inp" name="tax_calc" type="checkbox" value="1" data-type="checkbox">
                                  <label class="form-check-label" for="tax_calc">
                                      ${__html('Calculate')}
                                  </label>
                                </div>
                                <p class="form-text">${__html('Enable tax calculations when processing orders.')}</p>
                            </div> 
                          </div>
                      </div>

                      <div class="col-lg-6">
                          <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Geolocation')}</label>
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
                            <label class="col-sm-3 col-form-label">${__html('Percent')}</label>
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
                  </div>

                  <div class="tab-pane fade" id="nav-templates" role="tabpanel" aria-labelledby="nav-templates-link">
                    <h4 id="email-templates" class="card-title mb-4">${__html('Email Templates')}</h4>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('New order client email')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="new_order_client_email_subject" type="text" class="form-control inp" name="new_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="new_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="new_order_client_email_template-" type="text" class="form-control d-none" name="new_order_client_email_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('New order manager email')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="new_order_manager_email_subject" type="text" class="form-control inp" name="new_order_manager_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="new_order_manager_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="new_order_manager_email_template-" type="text" class="form-control d-none" name="new_order_manager_email_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Email List to Notify')}</label>
                                  <input id="new_order_manager_email_list" type="text" class="form-control inp" name="new_order_manager_email_list" data-type="email">
                                  <p class="form-text">${__html('List of email addresses (e.g., john@example.com, alex@example.com).')}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Client\'s order is in production.')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="production_order_client_email_subject" type="text" class="form-control inp" name="production_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="production_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="production_order_client_email_template-" type="text" class="form-control d-none" name="production_order_client_email_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Client\'s order is paid.')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="paid_order_client_email_subject" type="text" class="form-control inp" name="paid_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="paid_order_client_email_subject_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="paid_order_client_email_subject_template-" type="text" class="form-control d-none" name="paid_order_client_email_subject_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Client\'s order is canceled.')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="canceled_order_client_email_subject" type="text" class="form-control inp" name="canceled_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="canceled_order_client_email_subject_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="canceled_order_client_email_subject_template-" type="text" class="form-control d-none" name="canceled_order_client_email_subject_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Client\'s order is refunded.')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="refunded_order_client_email_subject" type="text" class="form-control inp" name="refunded_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="refunded_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="refunded_order_client_email_template-" type="text" class="form-control d-none" name="refunded_order_client_email_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Client\'s order is ready for pickup.')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="pickup_ready_order_client_email_subject" type="text" class="form-control inp" name="pickup_ready_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="pickup_ready_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="pickup_ready_order_client_email_template-" type="text" class="form-control d-none" name="pickup_ready_order_client_email_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Client\'s order ask feedback.')}</label>
                          <div class="col-sm-9">
                            <div class="row">
                              <div class="col-lg-8">
                                <div class="form-group mb-3">
                                  <label class="col-form-label">${__html('Subject')}</label>
                                  <input id="ask_feedback_order_client_email_subject" type="text" class="form-control inp" name="ask_feedback_order_client_email_subject" data-type="text">
                                </div>
                              </div>
                            </div>
                            <div id="ask_feedback_order_client_email_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="ask_feedback_order_client_email_template-" type="text" class="form-control d-none" name="ask_feedback_order_client_email_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('New order email templates with available dynamic fields include: {{order_id}}, {{order_link}}, {{client_first_name}}, etc.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Waybill template.')}</label>
                          <div class="col-sm-9">
                            <div id="waybill_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="waybill_document_template-" type="text" class="form-control d-none" name="waybill_document_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('Waybill document template with dynamic fields.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Invoice template.')}</label>
                          <div class="col-sm-9">
                            <div id="invoice_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="invoice_document_template-" type="text" class="form-control d-none" name="invoice_document_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('Invoice document template with dynamic fields.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Production slip template.')}</label>
                          <div class="col-sm-9">
                            <div id="production_slip_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="production_slip_document_template-" type="text" class="form-control d-none" name="production_slip_document_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('Production slip template with dynamic fields.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Package slip template.')}</label>
                          <div class="col-sm-9">
                            <div id="package_slip_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="package_slip_document_template-" type="text" class="form-control d-none" name="package_slip_document_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('Production slip template with dynamic fields.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-12">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Proforma template.')}</label>
                          <div class="col-sm-9">
                            <div id="proforma_document_template" class="html-editor inp" data-type="editor" style="min-height:400px;"></div>
                            <textarea id="proforma_document_template-" type="text" class="form-control d-none" name="proforma_document_template" data-type="textarea" rows="20"></textarea>
                            <p class="form-text">${__html('Invoice document template with dynamic fields.')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="tab-pane fade" id="nav-payout" role="tabpanel" aria-labelledby="nav-payout-link">
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Tax ID')}</label>
                          <div class="col-sm-9">
                            <input id="vat" type="text" class="form-control inp" name="vat" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Email')}</label>
                          <div class="col-sm-9">
                            <input id="email" type="email" class="form-control inp" name="email" data-type="email">
                          </div>
                        </div>
                      </div>
                    </div>
                    <p class="card-description">
                        ${__html('Address')}
                    </p>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label"> ${__html('Address 1')}</label>
                          <div class="col-sm-9">
                            <input id="addr1" type="text" class="form-control inp" name="addr1" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('State')}</label>
                          <div class="col-sm-9">
                            <input id="state" type="text" class="form-control inp" name="state" data-type="text">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Address 2')}</label>
                          <div class="col-sm-9">
                            <input id="addr2" type="text" class="form-control inp" name="addr2" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Postcode')}</label>
                          <div class="col-sm-9">
                            <input id="post" type="text" class="form-control inp" name="post" data-type="text">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('City')}</label>
                          <div class="col-sm-9">
                            <input id="city" type="text" class="form-control inp" name="city" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Country')}</label>
                          <div class="col-sm-9">
                            <select id="country" class="form-select inp" name="country" data-type="select">
                              
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 id="payout" class="card-title mb-4" title="payouts">${__html('Payout data')}</h4>
                    <p class="card-description">${__html('This information is used to process your earnings as part of Kenzap Affiliate or Kenzap Designing programs.')}</p>

                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html("Bank account holder's name")}</label>
                          <div class="col-sm-9">
                            <input id="y1" type="text" class="form-control inp" name="y1" minlength="2" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('IBAN/Account Nr.')}</label>
                          <div class="col-sm-9">
                            <input id="y2" type="text" class="form-control inp" name="y2" minlength="2" data-type="text">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('SWIFT Code')}</label>
                          <div class="col-sm-9">
                            <input id="y3" type="text" class="form-control inp" name="y3" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Bank name')}</label>
                          <div class="col-sm-9">
                            <input id="y4" type="text" class="form-control inp" name="y4" data-type="text">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Bank branch city')}</label>
                          <div class="col-sm-9">
                            <input id="y5" type="text" class="form-control inp" name="y5" data-type="text">
                          </div>
                        </div>
                      </div>
                      <div class="col-lg-6">
                        <div class="form-group row mb-3 mt-1">
                          <label class="col-sm-3 col-form-label">${__html('Bank branch country')}</label>
                          <div class="col-sm-9">
                            <select id="y6" class="form-select inp" name="y6" data-type="select">
                              
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
        </div>
    </div>
    `;
}