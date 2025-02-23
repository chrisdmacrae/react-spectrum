/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {ComboBox} from './example';
import {Item} from '@react-stately/collections';
import React from 'react';

const meta = {
  title: 'useComboBox'
};

export default meta;

let lotsOfItems: any[] = [];
for (let i = 0; i < 50; i++) {
  lotsOfItems.push({name: 'Item ' + i});
}

const Template = () => () => (
  <ComboBox label="Example" defaultItems={lotsOfItems}>
    {(item: any) => <Item key={item.name}>{item.name}</Item>}
  </ComboBox>
);

export const ScrollTesting = Template().bind({});
ScrollTesting.args = {};
