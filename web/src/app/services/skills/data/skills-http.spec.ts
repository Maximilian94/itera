import { TestBed } from '@angular/core/testing';

import { SkillsHttp } from './skills-http';

describe('SkillsHttp', () => {
  let service: SkillsHttp;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SkillsHttp);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
